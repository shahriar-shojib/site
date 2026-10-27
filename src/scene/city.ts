import { hash2, lerp } from './math'

export const enum CityPart {
  None,
  Near,
  NearWindow,
  Far,
  FarWindow,
  Shaft,
  ShaftLit,
  Pod,
  PodLit,
  Glass,
  Mast,
  Needle,
}

interface Building {
  left: number
  right: number
  top: number
  /** 0 window grid, 1 ribbon windows, 2 glass strips. */
  style: number
}

interface Row {
  seed: number
  /** Shortest and tallest building as fractions of the screen height. */
  low: number
  high: number
  /** Width range in cells. */
  narrow: number
  wide: number
}

export interface Skyline {
  part(x: number, y: number): CityPart
  /** Tip of the Sky Tower mast, where the aircraft beacon blinks. */
  beacon: { x: number; y: number }
}

/** One drum of the Sky Tower: where it ends in metres above the street, and its width in shaft widths at foot and head. */
interface Tier {
  top: number
  foot: number
  head?: number
  part: CityPart
}

const TOWER_METRES = 328
const SHAFT_METRES = 12

/** The tower from the street up, measured off a photo from the harbour. */
const TIERS: Tier[] = [
  { top: 16, foot: 2.2, head: 1, part: CityPart.Shaft },
  { top: 152, foot: 1, part: CityPart.Shaft },
  { top: 166, foot: 1.65, part: CityPart.Pod },
  { top: 175, foot: 1.65, part: CityPart.Glass },
  { top: 178, foot: 1.65, part: CityPart.Pod },
  { top: 184, foot: 1.65, part: CityPart.Glass },
  { top: 186, foot: 2.8, part: CityPart.Pod },
  { top: 193, foot: 2.5, part: CityPart.Glass },
  { top: 197, foot: 3, part: CityPart.Pod },
  { top: 201, foot: 1.5, part: CityPart.Glass },
  { top: 220, foot: 1.5, head: 1.15, part: CityPart.Pod },
  { top: 223.5, foot: 1.6, part: CityPart.Glass },
  { top: 235, foot: 0.8, part: CityPart.Pod },
  { top: 291, foot: 0.2, part: CityPart.Mast },
  { top: 328, foot: 0.1, part: CityPart.Needle },
]

const NEAR_ROW: Row = { seed: 77, low: 0.012, high: 0.05, narrow: 5, wide: 12 }
const FAR_ROW: Row = { seed: 41, low: 0.035, high: 0.13, narrow: 4, wide: 9 }

/** The CBD on the far shore: low blocks in front, glass towers behind, and the Sky Tower between them. */
export function skyline(left: number, right: number, horizonY: number, height: number, pitch: number): Skyline {
  const towerX = (Math.floor((left + (right - left) * 0.42) / pitch) + 0.5) * pitch
  const near = layoutRow(NEAR_ROW, left - pitch * 6, right + pitch * 6, towerX, horizonY, height, pitch)
  const far = layoutRow(FAR_ROW, left, right, towerX, horizonY, height, pitch)
  const tower = skyTower(towerX, horizonY, height * 0.34, pitch)
  const part = (x: number, y: number) =>
    building(near, x, y, horizonY, pitch, true) || tower.part(x, y) || building(far, x, y, horizonY, pitch, false)
  return { part, beacon: tower.tip }
}

// Dark edges keep the outline crisp against the dotted sky; a highlight runs just inside the sunlit right edge.
function shade(part: CityPart, col: number, width: number) {
  if (col === 0 || col === width - 1) return part === CityPart.Glass ? CityPart.Pod : part
  if (part === CityPart.Glass || col !== width - 2) return part
  return part === CityPart.Shaft ? CityPart.ShaftLit : CityPart.PodLit
}

/** The Sky Tower a whole cell at a time, so every ring of the pod keeps a crisp edge. */
function skyTower(x: number, base: number, size: number, pitch: number) {
  const rows = Math.round(size / pitch)
  const shaft = Math.max(2, Math.round((rows * SHAFT_METRES) / TOWER_METRES))
  const parity = shaft % 2
  // An odd shaft centres on a cell and an even one on a cell edge, so the rings stay symmetric either way.
  const x0 = (Math.floor(x / pitch) + parity * 0.5) * pitch
  const tops = tierRows(rows)
  const height = tops[tops.length - 1]

  const part = (x: number, y: number) => {
    const row = Math.floor((base - y) / pitch)
    if (row < 0 || row >= height) return CityPart.None
    const i = tops.findIndex((top) => row < top)
    const tier = TIERS[i]
    const from = i ? tops[i - 1] : 0
    const width = cells(shaft * lerp(tier.foot, tier.head ?? tier.foot, (row - from + 0.5) / (tops[i] - from)), parity)
    // A ring that can't match the shaft's parity, like the one-cell mast, sits half a cell to the sunny side.
    const left = x0 + ((width % 2 === parity ? 0 : 1) - width) * pitch * 0.5
    const col = Math.floor((x - left) / pitch)
    if (col < 0 || col >= width) return CityPart.None
    return shade(tier.part, col, width)
  }

  return { part, tip: { x: x0 + (1 - parity) * pitch * 0.5, y: base - (height - 0.5) * pitch } }
}

/** The nearest width in cells with the shaft's parity, never under one cell. */
function cells(width: number, parity: number) {
  return Math.max(1, 2 * Math.round((width - parity) / 2) + parity)
}

/** Each tier's top in rows from the ground; every tier keeps at least one row so the thin rings survive small screens. */
function tierRows(rows: number) {
  const tops: number[] = []
  for (const tier of TIERS) tops.push(Math.max(Math.round((tier.top / TOWER_METRES) * rows), (tops.at(-1) ?? 0) + 1))
  return tops
}

function building(row: Building[], x: number, y: number, horizonY: number, pitch: number, near: boolean) {
  const b = row.find((b) => x >= b.left && x < b.right)
  if (!b || y < b.top) return CityPart.None
  const column = Math.floor((x - b.left) / pitch)
  const line = Math.floor((y - b.top) / pitch)
  const inset = column > 0 && x < b.right - pitch && line > 0 && y < horizonY - pitch
  if (!inset) return near ? CityPart.Near : CityPart.Far
  const glass = [column % 2 === 1 && line % 2 === 1, line % 2 === 1, column % 3 === 1][b.style]
  if (glass) return near ? CityPart.NearWindow : CityPart.FarWindow
  return near ? CityPart.Near : CityPart.Far
}

/** Buildings snapped to whole cells, tallest near the tower; a narrow gap now and then keeps neighbours apart. */
function layoutRow(row: Row, left: number, right: number, towerX: number, horizonY: number, height: number, pitch: number) {
  const out: Building[] = []
  let x = Math.floor(left / pitch) * pitch
  for (let k = 0; x < right; k++) {
    const cells = Math.round(row.narrow + (row.wide - row.narrow) * hash2(k, row.seed))
    const width = cells * pitch
    const centre = 1 - Math.min(1, Math.abs(x + width / 2 - towerX) / ((right - left) * 0.6))
    const tall = Math.pow(hash2(k, row.seed + 1), 1.4)
    const h = height * (row.low + (row.high - row.low) * tall * centre)
    const top = Math.round((horizonY - h) / pitch) * pitch
    out.push({ left: x, right: x + width, top, style: Math.floor(hash2(k, row.seed + 2) * 3) })
    x += width + (hash2(k, row.seed + 3) < 0.3 ? pitch : 0)
  }
  return out
}
