import { clamp, hash2, smoothstep, type Box } from './math'

interface Cloud {
  x: number
  y: number
  size: number
  speed: number
  puffs: { dx: number; dy: number; r: number }[]
}

export interface CloudSample {
  /** How far inside the cloud the point is, in pixels; 0 or less is clear sky. */
  depth: number
  /** 0 on the sunlit top, 1 on the shaded underside. */
  shade: number
}

const CLEAR: CloudSample = { depth: 0, shade: 0 }

/** Flat-bottomed cumulus drifting east a whole cell at a time, built from overlapping puffs. Positions depend only on time. */
export class Clouds {
  private clouds: Cloud[]
  private sample: CloudSample = { depth: 0, shade: 0 }
  private offsets: number[]

  constructor(
    private width: number,
    horizonY: number,
    private pitch: number,
  ) {
    const count = Math.max(3, Math.round(width / 320))
    this.clouds = Array.from({ length: count }, (_, k) => {
      const size = Math.max(50, width * 0.05) * (0.7 + 0.8 * hash2(k, 21))
      const puffCount = 5 + Math.floor(hash2(k, 22) * 4)
      return {
        x: (k / count + 0.15 * hash2(k, 23)) * width,
        y: horizonY * (0.16 + 0.5 * hash2(k, 24)),
        size,
        speed: 3 + 4 * hash2(k, 25),
        puffs: Array.from({ length: puffCount }, (_, p) => {
          const a = (p / (puffCount - 1)) * 2 - 1
          const lift = (1 - Math.abs(a)) * (0.25 + 0.3 * hash2(k * 9, p))
          return { dx: a * size, dy: -lift * size, r: size * (0.32 + 0.22 * hash2(k, p + 40)) * (1 - Math.abs(a) * 0.35) }
        }),
      }
    })
    this.offsets = this.clouds.map(() => 0)
  }

  /** Moves the clouds and returns the areas that changed: where each cloud that stepped used to be and is now. */
  advance(time: number): Box[] {
    const wrap = this.width + 400
    const changed: Box[] = []
    this.clouds.forEach((c, k) => {
      const drift = ((((c.x + time * c.speed + 200) % wrap) + wrap) % wrap) - 200 - c.x
      const offset = Math.round(drift / this.pitch) * this.pitch
      if (offset === this.offsets[k]) return
      changed.push(this.box(k))
      this.offsets[k] = offset
      changed.push(this.box(k))
    })
    return changed
  }

  private box(k: number): Box {
    const c = this.clouds[k]
    const cx = c.x + this.offsets[k]
    return { left: cx - c.size * 1.6, right: cx + c.size * 1.6, top: c.y - c.size * 1.15, bottom: c.y + c.size * 0.18 }
  }

  at(x: number, y: number): CloudSample {
    let best = 0
    let top = 0
    let reach = 1
    for (let k = 0; k < this.clouds.length; k++) {
      const c = this.clouds[k]
      const cx = c.x + this.offsets[k]
      const base = c.y + c.size * 0.18
      if (Math.abs(x - cx) > c.size * 1.6 || y < c.y - c.size * 1.15 || base - y <= best) continue
      for (const p of c.puffs) {
        const dx = x - cx - p.dx
        const dy = y - c.y - p.dy
        const d2 = dx * dx + dy * dy
        if (d2 >= p.r * p.r) continue
        const inside = Math.min(p.r - Math.sqrt(d2), base - y)
        if (inside <= best) continue
        best = inside
        top = c.y + p.dy - p.r
        reach = base - top
      }
    }
    if (best <= 0) return CLEAR
    this.sample.depth = best
    this.sample.shade = smoothstep(0.35, 1, clamp((y - top) / reach))
    return this.sample
  }
}
