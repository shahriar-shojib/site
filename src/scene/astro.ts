const LAT = -36.85
const LON = 174.76
const ZONE = 'Pacific/Auckland'
const DAY_MS = 86_400_000
const SYNODIC_DAYS = 29.530588853
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14)

const rad = (deg: number) => (deg * Math.PI) / 180

export function aucklandDate(now: Date) {
  const parts = new Intl.DateTimeFormat('en-NZ', {
    timeZone: ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return { year: get('year'), month: get('month'), day: get('day') }
}

/** NOAA approximation of sunrise and sunset for Auckland on its local calendar day. */
export function sunTimes(now: Date) {
  const { year, month, day } = aucklandDate(now)
  const midnightUtc = Date.UTC(year, month - 1, day)
  const dayOfYear = (midnightUtc - Date.UTC(year, 0, 0)) / DAY_MS
  const g = ((2 * Math.PI) / 365) * (dayOfYear - 1)
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(g) -
      0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) -
      0.040849 * Math.sin(2 * g))
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g)
  const cosHa =
    Math.cos(rad(90.833)) / (Math.cos(rad(LAT)) * Math.cos(decl)) - Math.tan(rad(LAT)) * Math.tan(decl)
  const haMinutes = (Math.acos(Math.max(-1, Math.min(1, cosHa))) * 180) / Math.PI * 4
  const noon = midnightUtc + (720 - 4 * LON - eqTime) * 60_000
  return { sunrise: new Date(noon - haMinutes * 60_000), sunset: new Date(noon + haMinutes * 60_000) }
}

/** Where the sun or moon is along its arc: 0 at rise, 1 at set. */
export function skyProgress(now: Date) {
  const { sunrise, sunset } = sunTimes(now)
  const t = now.getTime()
  const rise = sunrise.getTime()
  const set = sunset.getTime()
  if (t >= rise && t <= set) return { isDay: true, progress: (t - rise) / (set - rise), sunrise, sunset }
  const nightStart = t > set ? set : set - DAY_MS
  const nightEnd = t > set ? rise + DAY_MS : rise
  return { isDay: false, progress: (t - nightStart) / (nightEnd - nightStart), sunrise, sunset }
}

/** 0 new moon, 0.5 full moon. */
export function moonPhase(now: Date) {
  const days = (now.getTime() - KNOWN_NEW_MOON) / DAY_MS
  const phase = (days / SYNODIC_DAYS) % 1
  return phase < 0 ? phase + 1 : phase
}

export function formatAucklandTime(date: Date) {
  return new Intl.DateTimeFormat('en-NZ', {
    timeZone: ZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(date)
    .replace(/\s/g, '')
    .toLowerCase()
}
