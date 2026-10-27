import { Clouds } from './clouds'
import type { DotRenderer } from './dots'
import { Layer, type Grid, type Landscape } from './landscape'
import type { Marks } from './marks'
import { clamp, fbm, hash2, lerp, mixRgb, noise2, smoothstep, type Box, type Rgb } from './math'
import { BEACON, BLUE, GLOW, GOLD, MOON, NAVY, NIGHT, PAPER, RIM, STAR, SUN, VIOLET, WORM } from './palette'

export interface Sky {
  /** 0 is day, 1 is night; values between are the crossfade. */
  night: number
  /** 0 at rise, 1 at set, for whichever body is up. */
  sunProgress: number
  moonProgress: number
  moonPhase: number
  time: number
}

export interface Streak {
  x: number
  y: number
  vx: number
  vy: number
  life: number
}

interface Body {
  x: number
  y: number
  r: number
}

interface Star {
  x: number
  y: number
  mag: number
  seed: number
}

type Px = { r: number; g: number; b: number; ink: number }

const HALO: Rgb = [128, 150, 255]
const MOON_MARIA: Rgb = [176, 184, 214]
const EARTHSHINE: Rgb = [40, 56, 150]
const DUSK: Rgb = [214, 20, 40]
// The fastest ripple moves under a cell in three frames, so each frame repaints every third water row.
const WATER_PASSES = 3

// Crux and its two pointers, in units of the constellation's height, top star first.
const CRUX: [number, number, number][] = [
  [0, -0.5, 1],
  [0.06, 0.5, 1],
  [-0.32, 0.02, 0.9],
  [0.3, -0.08, 0.75],
  [0.14, 0.18, 0.5],
  [-1.25, 0.72, 1],
  [-0.85, 0.6, 0.85],
]

/** Paints one frame of the scene into the dot grid. */
export class Painter {
  private sun: Body = { x: 0, y: 0, r: 0 }
  private moon: Body = { x: 0, y: 0, r: 0 }
  private moonPhase = 0
  private golden = 0
  private time = 0
  private bakedKey = ''
  /** Frame counter stamped on cells as moving clouds repaint them, since a cloud's old and new places overlap. */
  private visit = 0
  private visited: Uint32Array
  /** Each kept cell's colour and ink before the fade around the text, so moving that fade skips repainting the scene. */
  private plain: Float32Array
  private waterRows: Int32Array[]
  private cloudChanges: Box[] = []
  private out: Px = { r: 0, g: 0, b: 0, ink: 0 }
  private alt: Px = { r: 0, g: 0, b: 0, ink: 0 }
  private clouds: Clouds
  private stars: Star[] = []
  /** Fixed per-cell noise for picking between two inks, so colour blends print as grain instead of mud. */
  private grain: Float32Array
  /** Per-row sky gradients: height above the horizon (0 at the top, 1 at the horizon) and the inks it gives. */
  private rowV: Float32Array
  private rowDayInk: Float32Array
  private rowNightInk: Float32Array

  constructor(
    private grid: Grid,
    private land: Landscape,
    private dots: DotRenderer,
    private marks: Marks,
    public dim: Float32Array,
  ) {
    this.clouds = new Clouds(grid.width, land.horizonY, grid.pitch)
    this.grain = Float32Array.from({ length: grid.cols * grid.rows }, (_, i) => hash2(i, 911))
    this.visited = new Uint32Array(grid.cols * grid.rows)
    this.plain = new Float32Array(grid.cols * grid.rows * 4)
    this.waterRows = Array.from({ length: WATER_PASSES }, (_, k) =>
      land.water.filter((i) => Math.floor(i / grid.cols) % WATER_PASSES === k),
    )
    this.rowV = Float32Array.from({ length: grid.rows }, (_, cy) => Math.min(1, ((cy + 0.5) * grid.pitch) / land.horizonY))
    this.rowDayInk = this.rowV.map((v) => 0.64 * Math.pow(1 - v, 1.25))
    this.rowNightInk = this.rowV.map((v) => 0.012 + 0.66 * Math.pow(smoothstep(0.05, 1, v), 1.7))
    this.findStars()
  }

  /** Moves the sun, moon and clouds and marks the night lights; creatures mark on top afterwards. */
  prepare(sky: Sky, streaks: Streak[]) {
    this.time = sky.time
    this.cloudChanges = this.clouds.advance(sky.time)
    this.placeBodies(sky)
    if (sky.night <= 0) return
    this.markStars(sky)
    this.markCrux(sky)
    this.markGlowWorms(sky)
    this.markBeacon(sky)
    for (const s of streaks) this.markStreak(s, sky.night)
  }

  /** The picture is kept between frames: each frame repaints what drifted, then lays this frame's marks on top. */
  paint(sky: Sky) {
    this.visit++
    const key = this.lightKey(sky)
    if (key === this.bakedKey) this.refresh(sky)
    else this.bake(sky, key)
    for (const i of this.marks.touched) this.cell(i, sky, true)
  }

  /** Bakes again on the next frame, for when the whole fade around the text has changed. */
  invalidate() {
    this.bakedKey = ''
  }

  /** Re-applies the fade around the text to these cells from their stored colours. */
  refade(cells: Int32Array, night: number) {
    const { cols } = this.grid
    const { out, plain } = this
    for (const i of cells) {
      const k = i * 4
      out.r = plain[k]
      out.g = plain[k + 1]
      out.b = plain[k + 2]
      out.ink = plain[k + 3]
      this.fade(i, night, out)
      const cx = i % cols
      this.dots.put(i, cx, (i - cx) / cols, out.r, out.g, out.b, out.ink)
      this.dots.keepCell(i)
    }
  }

  private lightKey(sky: Sky) {
    const { sun, moon } = this
    const at = [sun.x, sun.y, moon.x, moon.y, this.golden * 100, this.moonPhase * 500].map(Math.round)
    return `${sky.night}|${at.join()}`
  }

  private bake(sky: Sky, key: string) {
    for (let i = 0; i < this.land.layer.length; i++) this.cell(i, sky, false)
    this.dots.keep()
    this.bakedKey = key
  }

  /** Starts from the kept picture and repaints a share of the water rows and any cloud that stepped a cell. */
  private refresh(sky: Sky) {
    this.dots.restore()
    for (const i of this.waterRows[this.visit % WATER_PASSES]) this.repaint(i, sky)
    const { cols, rows, pitch } = this.grid
    const { layer } = this.land
    for (const b of this.cloudChanges) {
      const c0 = Math.max(0, Math.floor(b.left / pitch))
      const c1 = Math.min(cols - 1, Math.floor(b.right / pitch))
      const r1 = Math.min(rows - 1, Math.floor(b.bottom / pitch))
      for (let cy = Math.max(0, Math.floor(b.top / pitch)); cy <= r1; cy++) {
        for (let cx = c0; cx <= c1; cx++) {
          const i = cy * cols + cx
          if (layer[i] !== Layer.Sky || this.visited[i] === this.visit) continue
          this.visited[i] = this.visit
          this.repaint(i, sky)
        }
      }
    }
  }

  private repaint(i: number, sky: Sky) {
    this.cell(i, sky, false)
    this.dots.keepCell(i)
  }

  /** Paints one cell, with this frame's marks on top when `marks` is set. */
  private cell(i: number, sky: Sky, marks: boolean) {
    const { cols, pitch } = this.grid
    const { out, alt } = this
    const cx = i % cols
    const cy = (i - cx) / cols
    const x = (cx + 0.5) * pitch
    const y = (cy + 0.5) * pitch
    const night = sky.night
    const layer = this.land.layer[i]
    if (layer === Layer.Sky || layer === Layer.Water) {
      const open = layer === Layer.Sky
      if (night < 1) open ? this.skyDay(x, y, cy, i, out) : this.waterDay(x, y, cx, i, out)
      const target = night < 1 ? alt : out
      if (night > 0) open ? this.skyNight(x, y, cy, target) : this.waterNight(x, y, cx, sky, target)
      if (night > 0 && night < 1) blend(out, alt, night)
    } else {
      this.base(i, night, out)
    }
    if (marks) this.overlay(i, out)
    else this.remember(i, out)
    this.fade(i, night, out)
    this.dots.put(i, cx, cy, out.r, out.g, out.b, out.ink)
  }

  private remember(i: number, out: Px) {
    const k = i * 4
    this.plain[k] = out.r
    this.plain[k + 1] = out.g
    this.plain[k + 2] = out.b
    this.plain[k + 3] = out.ink
  }

  private overlay(i: number, out: Px) {
    const a = this.marks.alpha[i]
    if (a <= 0) return
    const { rgb, ink } = this.marks
    const k = i * 3
    out.r = lerp(out.r, rgb[k], a)
    out.g = lerp(out.g, rgb[k + 1], a)
    out.b = lerp(out.b, rgb[k + 2], a)
    out.ink = lerp(out.ink, ink[i], a)
  }

  /** Near the text, colour falls back toward the page and dots thin out. */
  private fade(i: number, night: number, out: Px) {
    const d = this.dim[i]
    if (d >= 1) return
    out.r = lerp(lerp(PAPER[0], NIGHT[0], night), out.r, d)
    out.g = lerp(lerp(PAPER[1], NIGHT[1], night), out.g, d)
    out.b = lerp(lerp(PAPER[2], NIGHT[2], night), out.b, d)
    out.ink *= lerp(d, 1, 0.3 + 0.2 * night)
  }

  private placeBodies(sky: Sky) {
    const { width: w, height: h } = this.grid
    const horizonY = this.land.horizonY
    const r = Math.max(16, Math.min(w, h) * 0.046)
    // Rising on the right and setting behind Rangitoto keeps the path on the water clear of the intro text.
    const portrait = h > w
    const [rise, fall] = portrait ? [0.75, 0.15] : [0.85, 0.55]
    // On a phone the clock takes the top corner, so the arc stays lower.
    const height = portrait ? 0.6 : 0.78
    const arc = (p: number) => ({
      x: w * lerp(rise, fall, p),
      y: horizonY + r * 0.6 - (horizonY * height + r) * Math.sin(Math.PI * clamp(p)),
    })
    this.sun = { ...arc(sky.sunProgress), r }
    this.moon = { ...arc(sky.moonProgress), r: r * 0.8 }
    this.moonPhase = sky.moonPhase
    this.golden = 1 - smoothstep(0.05, 0.4, Math.sin(Math.PI * clamp(sky.sunProgress)))
  }

  private base(i: number, night: number, out: Px) {
    const l = this.land
    const k = i * 3
    out.r = lerp(l.dayRgb[k], l.nightRgb[k], night)
    out.g = lerp(l.dayRgb[k + 1], l.nightRgb[k + 1], night)
    out.b = lerp(l.dayRgb[k + 2], l.nightRgb[k + 2], night)
    out.ink = lerp(l.dayInk[i], l.nightInk[i], night)
  }

  /** Ultramarine thinning to bare paper at the horizon, gold light around the sun, white cumulus. */
  private skyDay(x: number, y: number, cy: number, i: number, out: Px) {
    const v = this.rowV[cy]
    const g = this.golden
    let ink = this.rowDayInk[cy]
    let rgb = BLUE
    const warm = g * 0.7 * smoothstep(0.3, 1, v)
    if (warm > 0) {
      if (this.grain[i] < warm / (warm + ink)) rgb = v > 0.82 ? GOLD : SUN
      ink = Math.min(1, ink + warm)
    }

    const s = this.sun
    const dx = x - s.x
    const dy = y - s.y
    const reach = s.r * 3.5
    if (dx > -reach && dx < reach && dy > -reach && dy < reach) {
      const d = Math.sqrt(dx * dx + dy * dy) / s.r
      if (d < 1) return set(out, g > 0.5 ? DUSK : SUN, 1)
      const glow = 1 - smoothstep(1, 3.5, d)
      if (this.grain[i] < glow) rgb = GOLD
      ink = lerp(ink, 0.5, glow)
    }

    const c = this.clouds.at(x, y)
    if (c.depth > 0) {
      const edge = c.depth < this.grid.pitch * 1.1
      rgb = g > 0.5 ? SUN : BLUE
      ink = edge ? 1 : 0.04 + 0.46 * c.shade
    }
    set(out, rgb, ink)
  }

  /** Black overhead, glowing ultramarine toward the city at the horizon, moonlit cloud edges. */
  private skyNight(x: number, y: number, cy: number, out: Px) {
    let ink = this.rowNightInk[cy]
    let rgb = this.rowV[cy] > 0.86 ? VIOLET : GLOW

    const m = this.moon
    const dx = x - m.x
    const dy = y - m.y
    const d = Math.sqrt(dx * dx + dy * dy) / m.r
    const c = this.clouds.at(x, y)
    if (c.depth > 0) {
      const moonlight = 1 - smoothstep(1, 9, d)
      if (c.depth < this.grid.pitch * 1.1) return set(out, RIM, 0.3 + 0.7 * moonlight)
      return set(out, GLOW, ink * 0.15)
    }
    if (d < 1) return this.moonSurface(x, y, out)
    const glow = 0.34 * (1 - smoothstep(1, 3.2, d))
    if (glow > ink) {
      rgb = HALO
      ink = glow
    }
    set(out, rgb, ink)
  }

  /** Lit side follows the real phase, mirrored for the southern hemisphere. */
  private moonSurface(x: number, y: number, out: Px) {
    const m = this.moon
    const nx = -(x - m.x) / m.r
    const ny = (y - m.y) / m.r
    const halfWidth = Math.sqrt(Math.max(0, 1 - ny * ny))
    const phase = this.moonPhase
    const k = Math.cos(2 * Math.PI * phase)
    const lit = phase < 0.5 ? nx > k * halfWidth : nx < -k * halfWidth
    if (!lit) return set(out, EARTHSHINE, 0.4)
    const maria = fbm(nx * 2.2 + 4, ny * 2.2 + 1, 3) > 0.56
    set(out, maria ? MOON_MARIA : MOON, maria ? 0.7 : 1)
  }

  /** Deep blue water darkening toward the shore, with paper glints gathering into a path under the sun. */
  private waterDay(x: number, y: number, cx: number, i: number, out: Px) {
    const horizonY = this.land.horizonY
    if (y - horizonY < this.grid.pitch) return set(out, BLUE, 0.08)
    const depth = clamp((y - horizonY) / (this.land.top[cx] - horizonY))
    const t = this.time
    const s = this.sun
    const column = Math.max(0, 1 - Math.abs(x - s.x) / (s.r * (1.2 + 3 * depth)))
    const glint = noise2(x * 0.1 + t * 0.25, y * 0.5 - t * 0.6)
    if (glint > 0.9 - 0.45 * column) return this.golden > 0.4 && column > 0 ? set(out, GOLD, 1) : set(out, BLUE, 0)
    const swell = noise2(x * 0.01 + t * 0.05, y * 0.12 - t * 0.2)
    const rgb = this.grain[i] < smoothstep(0.2, 0.9, depth) ? NAVY : BLUE
    set(out, rgb, 0.62 + 0.3 * depth + 0.16 * (swell - 0.5))
  }

  /** Black water carrying the moon's path, the sky glow and the city's lights as broken streaks. */
  private waterNight(x: number, y: number, cx: number, sky: Sky, out: Px) {
    const horizonY = this.land.horizonY
    const depth = clamp((y - horizonY) / (this.land.top[cx] - horizonY))
    const t = sky.time

    const m = this.moon
    const column = 1 - Math.abs(x - m.x) / (m.r * (0.5 + 2 * depth))
    if (column > 0) {
      const glint = noise2(x * 0.14 + t * 0.6, y * 0.6 - t * 0.3)
      const light = 0.45 + 0.55 * Math.sin(Math.PI * sky.moonPhase)
      if (glint > 0.88 - 0.3 * column * light) return set(out, MOON, 1)
    }

    const k = cx * 4
    const r = this.land.reflection
    const fade = (1 - depth) * (1 - depth)
    if (r[k + 3] > 0 && noise2(x * 0.08, y * 0.7 - t * 0.4) > 0.84 - 0.36 * r[k + 3] * fade) {
      out.r = r[k]
      out.g = r[k + 1]
      out.b = r[k + 2]
      out.ink = 1
      return
    }

    const ripple = noise2(x * 0.02 + t * 0.15, y * 0.45 - t * 0.1)
    const sheen = 1 - smoothstep(0, 0.4, depth)
    set(out, GLOW, sheen * (ripple > 0.5 ? 0.5 : 0.12))
  }

  private findStars() {
    const { cols, rows, pitch } = this.grid
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const y = (cy + 0.5) * pitch
        if (this.land.layer[cy * cols + cx] !== Layer.Sky || y > this.land.horizonY * 0.85) continue
        if (hash2(cx * 3 + 1, cy * 5 + 7) > 0.0022) continue
        this.stars.push({ x: (cx + 0.5) * pitch, y, mag: Math.pow(hash2(cx, cy * 9), 3), seed: hash2(cx * 17, cy) })
      }
    }
  }

  private markStars(sky: Sky) {
    for (const s of this.stars) {
      if (this.clouds.at(s.x, s.y).depth > 0) continue
      const twinkle = 0.55 + 0.45 * Math.sin(sky.time * (1 + s.seed * 3) + s.seed * 60)
      this.markStar(s.x, s.y, 0.35 + 0.65 * twinkle * (0.4 + 0.6 * s.mag), s.mag > 0.75, sky.night)
    }
  }

  private markStar(x: number, y: number, brightness: number, big: boolean, alpha: number) {
    const p = this.grid.pitch
    this.marks.at(x, y, mixRgb(NIGHT, STAR, brightness), 1, alpha)
    if (!big) return
    const arm = mixRgb(NIGHT, STAR, brightness * 0.55)
    this.marks.at(x + p, y, arm, 1, alpha)
    this.marks.at(x - p, y, arm, 1, alpha)
    this.marks.at(x, y + p, arm, 1, alpha)
    this.marks.at(x, y - p, arm, 1, alpha)
  }

  private markCrux(sky: Sky) {
    const { width: w, height: h } = this.grid
    const size = Math.max(h * 0.1, 56)
    for (const [dx, dy, mag] of CRUX) {
      const twinkle = 0.85 + 0.15 * Math.sin(sky.time * 2.3 + dx * 17)
      this.markStar(w * 0.4 + dx * size, h * 0.16 + dy * size, mag * twinkle, mag > 0.8, sky.night)
    }
  }

  private markGlowWorms(sky: Sky) {
    const { cols } = this.grid
    const glow = sky.night * sky.night
    for (const i of this.land.glowWorms) {
      const pulse = 0.5 + 0.5 * Math.sin(sky.time * 0.7 + hash2(i, 5) * 40)
      this.marks.cell(i % cols, (i / cols) | 0, mixRgb(NIGHT, WORM, 0.25 + 0.75 * pulse * pulse), 1, glow)
    }
  }

  private markBeacon(sky: Sky) {
    if (sky.time % 2.4 > 0.9) return
    const { x, y } = this.land.beacon
    this.marks.at(x, y, BEACON, 1, sky.night)
    this.marks.at(x, y + this.grid.pitch, BEACON, 1, sky.night)
  }

  private markStreak(s: Streak, night: number) {
    const speed = Math.hypot(s.vx, s.vy)
    const length = 40
    for (let k = length - 1; k >= 0; k--) {
      const back = (k * this.grid.pitch * 0.8) / speed
      const fade = (1 - k / length) * clamp(s.life * 2)
      this.marks.at(s.x - s.vx * back, s.y - s.vy * back, mixRgb(NIGHT, STAR, fade), 1, night)
    }
  }
}

function set(out: Px, rgb: Rgb, ink: number) {
  out.r = rgb[0]
  out.g = rgb[1]
  out.b = rgb[2]
  out.ink = ink
}

function blend(a: Px, b: Px, t: number) {
  a.r = lerp(a.r, b.r, t)
  a.g = lerp(a.g, b.g, t)
  a.b = lerp(a.b, b.b, t)
  a.ink = lerp(a.ink, b.ink, t)
}
