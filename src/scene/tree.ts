import { clamp, fbm, hash2, lerp } from './math'

interface Segment {
  x0: number
  y0: number
  x1: number
  y1: number
  r0: number
  r1: number
}

/** [start, control, end] points and radii at both ends, all in units of the tree's size. */
type Limb = [number, number, number, number, number, number, number, number]

// A pōhutukawa leaning out from the headland: a gnarled main trunk, a long reaching limb, surface roots.
const LIMBS: Limb[] = [
  [0, 0, -0.1, -0.6, -0.75, -1.0, 0.12, 0.055],
  [-0.28, -0.42, -0.25, -0.9, -0.1, -1.2, 0.06, 0.03],
  [-0.5, -0.72, -1.15, -0.85, -1.85, -0.72, 0.055, 0.02],
  [0.04, 0, 0.28, -0.5, 0.36, -1.08, 0.075, 0.03],
  [0, 0, 0.2, 0.02, 0.4, 0.1, 0.05, 0.012],
  [0, 0, -0.18, 0.03, -0.34, 0.08, 0.045, 0.012],
]

/** A bare twig behind the leaves that pokes out of the crown, where the fantail keeps watch against the sky. */
const TWIG: Limb = [-0.74, -1.4, -0.77, -1.72, -0.9, -1.93, 0.03, 0.016]

const SAMPLES = 10
const OUTSIDE = { field: -Infinity, underside: 0 }

export interface TreeShape {
  /** Positive inside the canopy; also returns how far down its leaf cluster the point sits, -1 top to 1 bottom. */
  canopy(x: number, y: number): { field: number; underside: number }
  trunk(x: number, y: number): boolean
  twig(x: number, y: number): boolean
  perch: { x: number; y: number }
  lookout: { x: number; y: number }
}

export function pohutukawa(rootX: number, rootY: number, size: number): TreeShape {
  const crownX = rootX - size * 0.62
  const crownY = rootY - size * 1.2
  const blobs = Array.from({ length: 13 }, (_, k) => {
    const a = k / 12
    const arch = Math.sin(Math.PI * a)
    return {
      x: crownX + (a - 0.55) * size * 2.9 + (hash2(k, 1) - 0.5) * size * 0.18,
      y: crownY - arch * size * 0.3 + (1 - arch) * size * 0.12 + (hash2(k, 2) - 0.5) * size * 0.14,
      r: size * (0.24 + 0.14 * hash2(k, 9)) * (0.65 + 0.35 * arch),
    }
  })

  const reach = Math.max(...blobs.map((b) => b.r)) * 1.3
  const crown = {
    left: Math.min(...blobs.map((b) => b.x)) - reach,
    right: Math.max(...blobs.map((b) => b.x)) + reach,
    top: Math.min(...blobs.map((b) => b.y)) - reach,
    bottom: Math.max(...blobs.map((b) => b.y)) + reach,
  }

  const canopy = (x: number, y: number) => {
    if (x < crown.left || x > crown.right || y < crown.top || y > crown.bottom) return OUTSIDE
    let field = -Infinity
    let underside = 0
    for (const b of blobs) {
      const f = 1 - Math.hypot(x - b.x, (y - b.y) * 1.4) / b.r
      if (f <= field) continue
      field = f
      underside = clamp((y - b.y) / b.r, -1, 1)
    }
    return { field: field + (fbm(x * 0.06, y * 0.06, 3) - 0.5) * 0.55, underside }
  }

  const trunk = hitTest(LIMBS.flatMap((limb) => sampleLimb(limb, rootX, rootY, size)))
  const twig = hitTest(sampleLimb(TWIG, rootX, rootY, size))

  const [, , , , endX, endY] = LIMBS[2]
  const [, , , , twigX, twigY] = TWIG
  return {
    canopy,
    trunk,
    twig,
    perch: { x: rootX + endX * size * 0.9, y: rootY + endY * size },
    lookout: { x: rootX + twigX * size, y: rootY + twigY * size },
  }
}

function sampleLimb(limb: Limb, rootX: number, rootY: number, size: number): Segment[] {
  const [x0, y0, cx, cy, x1, y1, r0, r1] = limb
  const point = (t: number) => ({
    x: rootX + size * ((1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1),
    y: rootY + size * ((1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1),
  })
  return Array.from({ length: SAMPLES }, (_, k) => {
    const a = point(k / SAMPLES)
    const b = point((k + 1) / SAMPLES)
    return {
      x0: a.x,
      y0: a.y,
      x1: b.x,
      y1: b.y,
      r0: size * lerp(r0, r1, k / SAMPLES),
      r1: size * lerp(r0, r1, (k + 1) / SAMPLES),
    }
  })
}

/** Whether a point lies on any of the segments, skipping the maths outside their bounding box. */
function hitTest(segments: Segment[]) {
  const bounds = segmentBounds(segments)
  return (x: number, y: number) => {
    if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) return false
    return segments.some((s) => {
      const { distance, t } = segmentDistance(x, y, s)
      return distance < lerp(s.r0, s.r1, t)
    })
  }
}

function segmentBounds(segments: Segment[]) {
  const pad = Math.max(...segments.map((s) => s.r0))
  return {
    left: Math.min(...segments.map((s) => Math.min(s.x0, s.x1))) - pad,
    right: Math.max(...segments.map((s) => Math.max(s.x0, s.x1))) + pad,
    top: Math.min(...segments.map((s) => Math.min(s.y0, s.y1))) - pad,
    bottom: Math.max(...segments.map((s) => Math.max(s.y0, s.y1))) + pad,
  }
}

function segmentDistance(px: number, py: number, s: Segment) {
  const dx = s.x1 - s.x0
  const dy = s.y1 - s.y0
  const t = clamp(((px - s.x0) * dx + (py - s.y0) * dy) / (dx * dx + dy * dy))
  return { distance: Math.hypot(px - (s.x0 + t * dx), py - (s.y0 + t * dy)), t }
}
