import { BAYER, BAYER_SIZE, type Rgb } from './math'

/** Draws the cell grid as ordered-dither square dots: one offscreen pixel per cell, scaled up, then a gap mask on top. */
export class DotRenderer {
  cols = 0
  rows = 0
  private pixels: ImageData | null = null
  /** The same cells as `pixels`, one word each, so copies move whole cells. */
  private words = new Uint32Array(0)
  private kept = new Uint32Array(0)
  private small = document.createElement('canvas')
  private smallCtx = this.small.getContext('2d')!
  private mask = document.createElement('canvas')
  private maskKey = ''
  private pattern: CanvasPattern | null = null

  constructor(
    private ctx: CanvasRenderingContext2D,
    private pitch: number,
    private dot: number,
  ) {}

  resize(cols: number, rows: number) {
    this.cols = cols
    this.rows = rows
    this.small.width = cols
    this.small.height = rows
    this.pixels = this.smallCtx.createImageData(cols, rows)
    this.words = new Uint32Array(this.pixels.data.buffer)
    this.kept = new Uint32Array(cols * rows)
    this.maskKey = ''
  }

  /** Remembers the current cells so later frames can start from them. */
  keep() {
    this.kept.set(this.words)
  }

  keepCell(i: number) {
    this.kept[i] = this.words[i]
  }

  /** Starts a frame from the kept cells. */
  restore() {
    this.words.set(this.kept)
  }

  /** Lights the dot when its ink beats the Bayer threshold for that cell. */
  put(i: number, cx: number, cy: number, r: number, g: number, b: number, ink: number) {
    const data = this.pixels!.data
    const o = i * 4
    if (ink <= BAYER[(cy % BAYER_SIZE) * BAYER_SIZE + (cx % BAYER_SIZE)]) {
      data[o + 3] = 0
      return
    }
    data[o] = r
    data[o + 1] = g
    data[o + 2] = b
    data[o + 3] = 255
  }

  draw(bg: Rgb, dpr: number) {
    const { ctx } = this
    const bgCss = `rgb(${bg[0] | 0},${bg[1] | 0},${bg[2] | 0})`
    this.smallCtx.putImageData(this.pixels!, 0, 0)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = bgCss
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.imageSmoothingEnabled = false
    const step = Math.round(this.pitch * dpr)
    ctx.drawImage(this.small, 0, 0, this.cols * step, this.rows * step)
    ctx.fillStyle = this.maskPattern(bgCss, step, this.dot * dpr)
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  }

  private maskPattern(bgCss: string, step: number, dot: number) {
    const key = `${bgCss}|${step}`
    if (key === this.maskKey && this.pattern) return this.pattern
    const size = Math.round(step)
    this.mask.width = size
    this.mask.height = size
    const m = this.mask.getContext('2d')!
    m.fillStyle = bgCss
    m.fillRect(0, 0, size, size)
    const inset = Math.round((size - dot) / 2)
    m.clearRect(inset, inset, Math.round(dot), Math.round(dot))
    this.pattern = this.ctx.createPattern(this.mask, 'repeat')
    this.maskKey = key
    return this.pattern!
  }
}
