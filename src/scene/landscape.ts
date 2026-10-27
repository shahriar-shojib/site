import { CityPart, skyline, type Skyline } from './city'
import { clamp, fbm, hash2, mixRgb, noise2, smoothstep, type Rgb } from './math'
import { AMBER, BARK, BLOOM, BLUE, FOREST, GREEN, NAVY, NIGHT, OFFICE, RIM, RIM_FAR, TOWER, TOWER_DIM, TOWER_HI } from './palette'
import { pohutukawa, type TreeShape } from './tree'

/** Ordered back to front, so a cell is a rim when the cell above it sits further back. */
export const enum Layer {
  Sky,
  Ridge,
  City,
  Rangitoto,
  Water,
  Land,
  Trunk,
  Tree,
}

export interface Grid {
  width: number
  height: number
  pitch: number
  cols: number
  rows: number
}

interface Material {
  rgb: Rgb
  ink: number
}

/** A cell's look by day (inks on paper) and by night (lights on black). */
interface Look {
  day: Material
  night: Material
}

const DARK: Material = { rgb: NIGHT, ink: 0 }
const BLANK: Look = { day: { rgb: BLUE, ink: 0 }, night: DARK }
const GLASS: Material = { rgb: BLUE, ink: 0 }
const WOOD: Look = { day: { rgb: BARK, ink: 1 }, night: DARK }

/**
 * The static scene, worked out once per resize: the Hauraki Gulf with Rangitoto, the CBD and Sky Tower on the far
 * shore, and a pōhutukawa on a headland in front.
 */
export class Landscape {
  layer: Uint8Array
  dayRgb: Float32Array
  nightRgb: Float32Array
  dayInk: Float32Array
  nightInk: Float32Array
  /** Foreground land height per column. */
  top: Float32Array
  /** City light reflected into the water per column: r, g, b, strength. */
  reflection: Float32Array
  glowWorms: number[] = []
  /** Indices of the water cells, which move every frame. */
  water = new Int32Array(0)
  perch = { x: 0, y: 0 }
  lookout = { x: 0, y: 0 }
  beacon = { x: 0, y: 0 }
  horizonY: number
  private tree: TreeShape
  private city: Skyline
  private volcano: { x: number; half: number; height: number }

  constructor(
    private grid: Grid,
    private flowering: boolean,
  ) {
    const { width: w, height: h, pitch, cols } = grid
    const n = cols * grid.rows
    this.layer = new Uint8Array(n)
    this.dayRgb = new Float32Array(n * 3)
    this.nightRgb = new Float32Array(n * 3)
    this.dayInk = new Float32Array(n)
    this.nightInk = new Float32Array(n)
    this.top = new Float32Array(cols)
    this.reflection = new Float32Array(cols * 4)
    this.horizonY = h * (h > w ? 0.44 : 0.6)
    const half = Math.max(w * 0.14, 130)
    this.volcano = { x: w * 0.545, half, height: Math.min(h * 0.085, half * 0.3) }
    const treeSize = Math.max(Math.min(w, h * 1.5) * 0.105, 70)
    const rootX = w * 0.955
    this.tree = pohutukawa(rootX, this.landTop(rootX) + pitch * 2, treeSize)
    this.perch = this.tree.perch
    this.lookout = this.tree.lookout
    this.city = skyline(w * 0.655, w * 0.765, this.horizonY, h, pitch)
    this.beacon = this.city.beacon
    this.build()
  }

  /** Top of the foreground land at pixel x: a low shore rising to a headland on the right. */
  landTop(x: number) {
    const span = this.grid.height - this.horizonY
    const u = x / this.grid.width
    const headland = 0.24 * smoothstep(0.5, 1.02, u)
    return this.horizonY + span * (0.52 - headland + 0.025 * Math.sin(u * 9 + 0.6) + 0.07 * (fbm(u * 3, 9.1, 2) - 0.5))
  }

  private rangitotoTop(x: number) {
    const v = this.volcano
    const d = Math.abs(x - v.x) / v.half
    if (d >= 1) return Infinity
    const shape = Math.pow(Math.cos((d * Math.PI) / 2), 2.2) * (0.94 + 0.06 * Math.max(0, 1 - d / 0.08))
    return this.horizonY - shape * v.height
  }

  /** Bush-covered flanks: the eastern side in sun, the western in shadow, split along a ragged line. */
  private rangitotoLook(x: number, y: number): Look {
    const v = this.volcano
    const across = (x - v.x) / v.half
    const down = clamp((y - (this.horizonY - v.height)) / v.height)
    const bush = fbm(x * 0.06, y * 0.06, 3)
    const lit = across > 0.05 - 0.4 * down + 0.4 * (bush - 0.5)
    const day = lit ? { rgb: BLUE, ink: 0.8 + 0.4 * (bush - 0.5) } : { rgb: NAVY, ink: 0.94 + 0.2 * (bush - 0.5) }
    return { day, night: DARK }
  }

  private ridgeTop(x: number) {
    const u = x / this.grid.width
    return this.horizonY - this.grid.height * (0.006 + 0.016 * fbm(u * 5 + 3, 1.7, 3))
  }

  private build() {
    const { cols, rows, pitch } = this.grid
    for (let cx = 0; cx < cols; cx++) this.top[cx] = this.landTop((cx + 0.5) * pitch)
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const [layer, look] = this.classify((cx + 0.5) * pitch, (cy + 0.5) * pitch, cx, cy)
        this.write(cy * cols + cx, layer, look)
      }
    }
    this.gatherReflections()
    for (let i = cols; i < cols * rows; i++) this.rim(i, this.layer[i - cols])
    this.findGlowWorms()
    this.water = Int32Array.from(this.layer.keys()).filter((i) => this.layer[i] === Layer.Water)
  }

  private write(i: number, layer: Layer, look: Look) {
    this.layer[i] = layer
    this.dayInk[i] = look.day.ink
    this.nightInk[i] = look.night.ink
    this.dayRgb.set(look.day.rgb, i * 3)
    this.nightRgb.set(look.night.rgb, i * 3)
  }

  /** Moonlight catches every edge that faces the sky; by day the same edges get a crisp outline. */
  private rim(i: number, above: Layer) {
    const layer = this.layer[i] as Layer
    if (above >= layer || above > Layer.Water) return
    const night = rimLight(layer, this.nightInk[i])
    if (night) {
      this.nightRgb.set(night.rgb, i * 3)
      this.nightInk[i] = night.ink
    }
    const outline = layer === Layer.Land ? FOREST : layer === Layer.Rangitoto ? NAVY : null
    if (!outline) return
    this.dayRgb.set(outline, i * 3)
    this.dayInk[i] = 1
  }

  private findGlowWorms() {
    const { cols, rows, pitch, width: w } = this.grid
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = Math.floor((w * 0.8) / pitch); cx < cols; cx++) {
        const i = cy * cols + cx
        const below = (cy + 0.5) * pitch - this.top[cx]
        if (this.layer[i] !== Layer.Land || below < 16 || below > 110) continue
        if (hash2(cx * 7, cy * 3) < 0.006) this.glowWorms.push(i)
      }
    }
  }

  private gatherReflections() {
    const { cols, rows } = this.grid
    const r = this.reflection
    for (let i = 0; i < cols * rows; i++) {
      if (this.layer[i] !== Layer.City || this.nightInk[i] < 0.5) continue
      const k = (i % cols) * 4
      const strength = this.nightInk[i]
      r[k] += this.nightRgb[i * 3] * strength
      r[k + 1] += this.nightRgb[i * 3 + 1] * strength
      r[k + 2] += this.nightRgb[i * 3 + 2] * strength
      r[k + 3] += strength
    }
    for (let k = 0; k < cols * 4; k += 4) {
      const total = r[k + 3]
      if (total <= 0) continue
      r[k] /= total
      r[k + 1] /= total
      r[k + 2] /= total
      r[k + 3] = clamp(total / 5)
    }
  }

  private classify(x: number, y: number, cx: number, cy: number): [Layer, Look] {
    if (this.tree.trunk(x, y)) return [Layer.Trunk, WOOD]
    const leaves = this.tree.canopy(x, y)
    if (leaves.field > 0.04) return [Layer.Tree, canopyLook(leaves.underside, cx, cy, this.flowering)]
    if (this.tree.twig(x, y)) return [Layer.Trunk, WOOD]

    const landTop = this.top[cx]
    if (y >= landTop) return [Layer.Land, landLook((y - landTop) / this.grid.height, x, y)]
    if (y >= this.horizonY) return [Layer.Water, BLANK]

    const rangitoto = this.rangitotoTop(x)
    if (y >= rangitoto) return [Layer.Rangitoto, this.rangitotoLook(x, y)]
    const part = this.city.part(x, y)
    if (part) return [Layer.City, cityLook(part, cx, cy)]
    if (y >= this.ridgeTop(x)) return [Layer.Ridge, { day: { rgb: BLUE, ink: 0.3 }, night: DARK }]
    return [Layer.Sky, BLANK]
  }
}

function rimLight(layer: Layer, ink: number): Material | null {
  if (layer === Layer.Land || layer === Layer.Tree || layer === Layer.Trunk) return { rgb: RIM, ink: 1 }
  if (layer === Layer.Rangitoto) return { rgb: RIM_FAR, ink: 1 }
  if (layer === Layer.City && ink === 0) return { rgb: RIM_FAR, ink: 0.8 }
  return null
}

function landLook(depth: number, x: number, y: number): Look {
  const near = smoothstep(0, 0.3, depth)
  const tuft = noise2(x * 0.09, y * 0.035)
  return {
    day: { rgb: mixRgb(GREEN, FOREST, near * 0.85), ink: 0.62 + 0.32 * near + 0.22 * (tuft - 0.5) },
    night: DARK,
  }
}

function cityLook(part: CityPart, cx: number, cy: number): Look {
  const chance = hash2(cx * 13, cy * 7)
  switch (part) {
    case CityPart.Near:
      return { day: { rgb: NAVY, ink: 1 }, night: DARK }
    case CityPart.NearWindow:
      return { day: GLASS, night: chance < 0.42 ? { rgb: AMBER, ink: 1 } : DARK }
    case CityPart.Far:
      return { day: { rgb: BLUE, ink: 1 }, night: DARK }
    case CityPart.FarWindow:
      return { day: GLASS, night: chance < 0.3 ? { rgb: OFFICE, ink: 0.85 } : DARK }
    case CityPart.Shaft:
      return { day: { rgb: NAVY, ink: 1 }, night: { rgb: TOWER_DIM, ink: 0.62 } }
    case CityPart.ShaftLit:
      return { day: { rgb: BLUE, ink: 1 }, night: { rgb: TOWER, ink: 0.8 } }
    case CityPart.Pod:
      return { day: { rgb: NAVY, ink: 1 }, night: { rgb: TOWER, ink: 1 } }
    case CityPart.PodLit:
      return { day: { rgb: BLUE, ink: 1 }, night: { rgb: TOWER_HI, ink: 1 } }
    case CityPart.Glass:
      return { day: { rgb: BLUE, ink: 1 }, night: cx % 2 ? { rgb: OFFICE, ink: 1 } : { rgb: TOWER_DIM, ink: 0.8 } }
    case CityPart.Needle:
      return { day: { rgb: NAVY, ink: 0.6 }, night: { rgb: [96, 60, 150], ink: 0.35 } }
    default:
      return { day: { rgb: NAVY, ink: 1 }, night: { rgb: [96, 60, 150], ink: 0.5 } }
  }
}

function canopyLook(underside: number, cx: number, cy: number, flowering: boolean): Look {
  const shade = smoothstep(-0.6, 0.7, underside)
  if (flowering && underside < -0.1 && hash2(cx * 5, cy * 11) < 0.3) return { day: { rgb: BLOOM, ink: 1 }, night: DARK }
  const fleck = noise2(cx * 0.5, cy * 0.5)
  return { day: { rgb: mixRgb(GREEN, FOREST, shade), ink: 0.84 + 0.3 * (fleck - 0.5) }, night: DARK }
}
