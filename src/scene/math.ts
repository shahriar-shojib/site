export type Rgb = [number, number, number]

export interface Box {
  left: number
  top: number
  right: number
  bottom: number
}

export const clamp = (v: number, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v)

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function smoothstep(e0: number, e1: number, x: number) {
  const t = clamp((x - e0) / (e1 - e0))
  return t * t * (3 - 2 * t)
}

export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

export function hash2(x: number, y: number) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

export function noise2(x: number, y: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash2(xi, yi)
  const b = hash2(xi + 1, yi)
  const c = hash2(xi, yi + 1)
  const d = hash2(xi + 1, yi + 1)
  return lerp(lerp(a, b, u), lerp(c, d, u), v)
}

export function fbm(x: number, y: number, octaves = 3) {
  let sum = 0
  let amp = 0.5
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += noise2(x, y) * amp
    norm += amp
    x *= 2.03
    y *= 2.03
    amp *= 0.5
  }
  return sum / norm
}

function bayerMatrix(size: number): number[] {
  if (size === 1) return [0]
  const half = size / 2
  const prev = bayerMatrix(half)
  const out = new Array<number>(size * size)
  const offsets = [0, 2, 3, 1]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const quadrant = (y >= half ? 2 : 0) + (x >= half ? 1 : 0)
      out[y * size + x] = 4 * prev[(y % half) * half + (x % half)] + offsets[quadrant]
    }
  }
  return out
}

export const BAYER_SIZE = 8
export const BAYER = bayerMatrix(BAYER_SIZE).map((v) => (v + 0.5) / (BAYER_SIZE * BAYER_SIZE))
