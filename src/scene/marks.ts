import type { Grid } from './landscape'
import type { Rgb } from './math'

/** Per-frame marks laid over the landscape: stars, glow-worms, creatures. Later marks win. */
export class Marks {
  alpha: Float32Array
  ink: Float32Array
  rgb: Float32Array
  /** Cells marked this frame. */
  touched: number[] = []

  constructor(public grid: Grid) {
    const n = grid.cols * grid.rows
    this.alpha = new Float32Array(n)
    this.ink = new Float32Array(n)
    this.rgb = new Float32Array(n * 3)
  }

  clear() {
    for (const i of this.touched) this.alpha[i] = 0
    this.touched.length = 0
  }

  /** Marks the cell under pixel (x, y). */
  at(x: number, y: number, rgb: Rgb, ink: number, alpha = 1) {
    this.cell(Math.floor(x / this.grid.pitch), Math.floor(y / this.grid.pitch), rgb, ink, alpha)
  }

  cell(cx: number, cy: number, rgb: Rgb, ink: number, alpha = 1) {
    const { cols, rows } = this.grid
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows || alpha <= 0) return
    const i = cy * cols + cx
    if (this.alpha[i] === 0) this.touched.push(i)
    this.alpha[i] = alpha
    this.ink[i] = ink
    this.rgb[i * 3] = rgb[0]
    this.rgb[i * 3 + 1] = rgb[1]
    this.rgb[i * 3 + 2] = rgb[2]
  }
}
