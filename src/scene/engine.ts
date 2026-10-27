// Loop, resize, pointer and reduced-motion wiring follows stackedlol/ascii-sharks (MIT).
import { moonPhase, skyProgress } from './astro'
import { Creatures, type Pointer } from './creatures'
import { DotRenderer } from './dots'
import { Landscape, type Grid } from './landscape'
import { Marks } from './marks'
import { clamp, lerp, mixRgb, smoothstep, type Box } from './math'
import { Painter, type Sky, type Streak } from './paint'
import { NIGHT, PAPER } from './palette'

const AVOID = '[data-scene-avoid]'
// The scene stays clear for CLEAR_PX around the text, then dissolves back in over FADE_PX.
const CLEAR_PX = 24
const FADE_PX = 130
// Phones get a tighter fade so the scene isn't all fade.
const FADE_SHARE = 0.16
const CLEAR_SECONDS = 0.6
// The grid moves things a whole cell at a time, so frames beyond 30 a second change nothing you can see.
const FRAME_MS = 1000 / 30
// When the toggle disagrees with the clock, park the sun or moon somewhere flattering.
const POSED_SUN = 0.7
const POSED_MOON = 0.22

export class SceneEngine {
  private ctx: CanvasRenderingContext2D
  private grid!: Grid
  private land!: Landscape
  private dots!: DotRenderer
  private painter!: Painter
  private marks!: Marks
  private creatures!: Creatures
  private avoid: Box[] = []
  private avoidKey = ''
  private avoidRects: Box[] = []
  private clearFrom = new Float32Array(0)
  private clearTo = new Float32Array(0)
  private clearCells = new Int32Array(0)
  private clearT = 1
  private pointer: Pointer = { x: 0, y: 0, active: false }
  private streaks: Streak[] = []
  private nextStreak = 6
  private night: number
  private nightTarget: number
  private time = 0
  private raf = 0
  private last = 0
  private dpr = 1
  private disposed = false
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  private resizeObserver = new ResizeObserver(() => this.resize())
  // With motion off there is no loop to notice a page change, so the DOM has to say so.
  private pageObserver = new MutationObserver(() => {
    if (!this.reducedMotion.matches) return
    this.measureContent(true)
    this.render()
  })

  constructor(
    private canvas: HTMLCanvasElement,
    night: boolean,
  ) {
    this.ctx = canvas.getContext('2d')!
    this.night = this.nightTarget = night ? 1 : 0
    this.resizeObserver.observe(canvas)
    this.pageObserver.observe(document.body, { childList: true, subtree: true })
    this.reducedMotion.addEventListener('change', this.schedule)
    document.addEventListener('visibilitychange', this.schedule)
    window.addEventListener('pointermove', this.onPointerMove, { passive: true })
    window.addEventListener('pointerdown', this.onPointerDown)
    document.documentElement.addEventListener('pointerleave', this.onPointerLeave)
    window.addEventListener('blur', this.onPointerLeave)
    this.resize()
    this.schedule()
  }

  destroy() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.resizeObserver.disconnect()
    this.pageObserver.disconnect()
    this.reducedMotion.removeEventListener('change', this.schedule)
    document.removeEventListener('visibilitychange', this.schedule)
    window.removeEventListener('pointermove', this.onPointerMove)
    window.removeEventListener('pointerdown', this.onPointerDown)
    document.documentElement.removeEventListener('pointerleave', this.onPointerLeave)
    window.removeEventListener('blur', this.onPointerLeave)
  }

  setNight(night: boolean) {
    this.nightTarget = night ? 1 : 0
    if (this.reducedMotion.matches) {
      this.night = this.nightTarget
      this.render()
    }
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) return
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.round(rect.width * this.dpr)
    this.canvas.height = Math.round(rect.height * this.dpr)
    const base = rect.width < 700 ? 2.5 : 3
    const pitch = Math.max(1, Math.round(base * this.dpr)) / this.dpr
    const cols = Math.ceil(rect.width / pitch)
    const rows = Math.ceil(rect.height / pitch)
    this.grid = { width: rect.width, height: rect.height, pitch, cols, rows }
    const month = new Date().getMonth() + 1
    this.land = new Landscape(this.grid, month === 12 || month === 1 || month === 11)
    this.dots = new DotRenderer(this.ctx, pitch, pitch * 0.8)
    this.dots.resize(cols, rows)
    this.marks = new Marks(this.grid)
    this.painter = new Painter(this.grid, this.land, this.dots, this.marks, new Float32Array(cols * rows).fill(1))
    this.creatures = new Creatures(this.grid, this.land, this.avoid)
    this.measureContent(true)
    this.render()
  }

  /** Clears the scene behind the text, easing between layouts when the page changes. */
  private measureContent(immediate = false) {
    const rects = this.contentRects()
    const boxes = rects.map(this.clip)
    const key = boxes.map((b) => [b.left, b.top, b.right, b.bottom].map(Math.round).join()).join('|')
    if (!immediate && key === this.avoidKey) return
    // Text that only scrolled keeps its clearing pinned to it; a new page eases in.
    const follow = immediate || sameSizes(this.avoidRects, rects)
    this.avoidKey = key
    this.avoidRects = rects
    this.avoid = boxes
    this.creatures.avoid = boxes
    this.clearFrom = this.painter.dim.slice()
    this.clearTo = this.clearing(boxes)
    this.clearCells = changedCells(this.clearFrom, this.clearTo)
    this.clearT = follow ? 1 : 0
    if (!follow) return
    this.painter.dim.set(this.clearTo)
    this.painter.invalidate()
  }

  private contentRects(): Box[] {
    const origin = this.canvas.getBoundingClientRect()
    return Array.from(document.querySelectorAll(AVOID), (el) => {
      const b = el.getBoundingClientRect()
      return { left: b.left - origin.left, top: b.top - origin.top, right: b.right - origin.left, bottom: b.bottom - origin.top }
    })
  }

  /** Cuts a box to the canvas edges, which changes nothing on screen but keeps a tall scrolling page from re-measuring. */
  private clip = (b: Box): Box => ({
    left: Math.max(0, b.left),
    top: Math.max(0, b.top),
    right: Math.min(this.grid.width, b.right),
    bottom: Math.min(this.grid.height, b.bottom),
  })

  /** How much of the scene each cell keeps: none behind the text, all of it past the fade. */
  private clearing(boxes: Box[]) {
    const { cols, rows, pitch, width } = this.grid
    const fade = Math.min(FADE_PX, width * FADE_SHARE)
    const dim = new Float32Array(cols * rows)
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const x = (cx + 0.5) * pitch
        const y = (cy + 0.5) * pitch
        let nearest = Infinity
        for (const b of boxes) {
          const dx = Math.max(b.left - x, 0, x - b.right)
          const dy = Math.max(b.top - y, 0, y - b.bottom)
          nearest = Math.min(nearest, dx * dx + dy * dy)
        }
        dim[cy * cols + cx] = smoothstep(CLEAR_PX, CLEAR_PX + fade, Math.sqrt(nearest))
      }
    }
    return dim
  }

  private schedule = () => {
    cancelAnimationFrame(this.raf)
    if (this.disposed || document.hidden) return
    if (this.reducedMotion.matches) {
      this.night = this.nightTarget
      this.render()
      return
    }
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.frame)
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame)
    if (now - this.last < FRAME_MS - 4) return
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    this.measureContent()
    this.step(dt)
    this.render()
  }

  private step(dt: number) {
    this.time += dt
    const toward = this.nightTarget - this.night
    this.night = clamp(this.night + Math.sign(toward) * Math.min(Math.abs(toward), dt / 1.6))
    this.creatures.update(dt, this.eased(), this.pointer)
    this.stepStreaks(dt)
    if (this.clearT >= 1) return
    this.clearT = Math.min(1, this.clearT + dt / CLEAR_SECONDS)
    const t = smoothstep(0, 1, this.clearT)
    const { dim } = this.painter
    for (const i of this.clearCells) dim[i] = lerp(this.clearFrom[i], this.clearTo[i], t)
    this.painter.refade(this.clearCells, this.eased())
  }

  private stepStreaks(dt: number) {
    for (const s of this.streaks) {
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.life -= dt
    }
    this.streaks = this.streaks.filter((s) => s.life > 0)
    this.nextStreak -= dt
    if (this.nextStreak > 0 || this.night < 0.9) return
    const { width: w, height: h } = this.grid
    this.launchStreak(w * (0.2 + Math.random() * 0.7), h * (0.05 + Math.random() * 0.2))
    this.nextStreak = 9 + Math.random() * 16
  }

  private launchStreak(x: number, y: number) {
    const angle = Math.PI * (0.72 + Math.random() * 0.12)
    const speed = 520 + Math.random() * 200
    this.streaks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.6 + Math.random() * 0.3 })
  }

  private eased() {
    const t = this.night
    return t * t * (3 - 2 * t)
  }

  private skyState(): Sky {
    const now = new Date()
    const real = skyProgress(now)
    const night = this.eased()
    return {
      night,
      sunProgress: real.isDay ? real.progress : POSED_SUN,
      moonProgress: real.isDay ? POSED_MOON : real.progress,
      moonPhase: moonPhase(now),
      time: this.time,
    }
  }

  private render() {
    const sky = this.skyState()
    this.marks.clear()
    this.painter.prepare(sky, this.streaks)
    this.creatures.draw(this.marks, sky.night)
    this.painter.paint(sky)
    this.dots.draw(mixRgb(PAPER, NIGHT, sky.night), this.dpr)
  }

  private toLocal(e: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  private onPointerMove = (e: PointerEvent) => {
    const { x, y } = this.toLocal(e)
    this.pointer.x = x
    this.pointer.y = y
    this.pointer.active = e.pointerType !== 'touch'
  }

  private onPointerDown = (e: PointerEvent) => {
    if ((e.target as Element).closest('a, button')) return
    const { x, y } = this.toLocal(e)
    if (this.reducedMotion.matches) return
    if (this.night > 0.5) this.launchStreak(x, y)
    else this.creatures.release(x, y)
  }

  private onPointerLeave = () => {
    this.pointer.active = false
  }
}

/** The cells where two fades differ, so an ease only touches what moves. */
function changedCells(from: Float32Array, to: Float32Array) {
  const cells: number[] = []
  for (let i = 0; i < from.length; i++) if (from[i] !== to[i]) cells.push(i)
  return Int32Array.from(cells)
}

function sameSizes(a: Box[], b: Box[]) {
  const size = (r: Box) => `${Math.round(r.right - r.left)}x${Math.round(r.bottom - r.top)}`
  return a.length === b.length && a.every((r, i) => size(r) === size(b[i]))
}
