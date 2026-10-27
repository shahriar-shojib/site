import type { Grid, Landscape } from './landscape'
import type { Marks } from './marks'
import { lerp, mixRgb, type Box, type Rgb } from './math'
import { NIGHT } from './palette'
import { BUNNY, FANTAIL, GULL, KERERU, KIWI, RURU, drawSprite, type Sprite } from './sprites'

export interface Pointer {
  x: number
  y: number
  active: boolean
}

type Kind = 'kereru' | 'gull' | 'fantail' | 'bunny' | 'kiwi' | 'ruru'

interface Actor {
  kind: Kind
  x: number
  y: number
  vx: number
  vy: number
  dir: number
  clock: number
  /** Wingbeat or gait angle; for a hopping rabbit, how far through the hop it is, 0 to 1. */
  phase: number
  /** Eases toward 1 while probing or looking aside. */
  ease: number
  /** Seconds left in the current behaviour. */
  timer: number
  state: string
  /** Walkers keep to a line this far below the shoreline. */
  lane: number
  /** Hops left in a rabbit's current run. */
  hops: number
}

const NOCTURNAL = new Set<Kind>(['kiwi', 'ruru'])
const RESTS = ['sit', 'nibble', 'nibble', 'alert'] as const
const HOP_SECONDS = 0.34
const HOP_REACH = 16
const HOP_LIFT = 8
/** Share of a hop spent crouched at take-off, and again on landing. */
const CROUCH = 0.2

const CALL: Rgb = [255, 228, 160]

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo)
const TAU = Math.PI * 2

export class Creatures {
  private actors: Actor[] = []
  private fantail: Actor
  private ruru: Actor
  private call = { age: Infinity, wait: rand(5, 10) }
  private nextKereru = rand(1, 4)
  private nextGulls = rand(4, 10)

  constructor(
    private grid: Grid,
    private land: Landscape,
    public avoid: Box[],
  ) {
    const { perch, lookout } = land
    this.fantail = this.actor('fantail', lookout.x, lookout.y)
    this.ruru = this.actor('ruru', perch.x, perch.y)
    this.actors.push(this.fantail, this.ruru)
    this.spawnWalkers()
  }

  update(dt: number, night: number, pointer: Pointer) {
    this.spawnFliers(dt, night)
    for (const a of this.actors) {
      a.clock += dt
      a.timer -= dt
      if (a.kind === 'kereru') this.flyKereru(a, dt)
      else if (a.kind === 'gull') this.flyGull(a, dt)
      else if (a.kind === 'fantail') this.flit(a, dt, pointer)
      else if (a.kind === 'ruru') this.watch(a, dt)
      else if (a.kind === 'bunny') this.graze(a, dt, pointer)
      else this.wander(a, dt)
    }
    this.callOut(dt, night)
    this.actors = this.actors.filter((a) => a.state !== 'gone')
  }

  /** A click by day sends a kererū up from the pointer. */
  release(x: number, y: number) {
    const k = this.actor('kereru', x, y)
    k.dir = x < this.grid.width / 2 ? -1 : 1
    k.vx = k.dir * rand(70, 90)
    k.vy = -rand(50, 70)
    k.state = 'flap'
    k.timer = 1.6
    this.actors.push(k)
  }

  draw(marks: Marks, night: number) {
    for (const a of this.actors) {
      const presence = NOCTURNAL.has(a.kind) ? night : 1 - night
      if (presence >= 0.02) drawSprite(marks, this.sprite(a), a.x, a.y, a.dir, presence)
    }
    this.drawCall(marks, night)
  }

  private sprite(a: Actor): Sprite {
    const beat = Math.sin(a.phase)
    if (a.kind === 'kereru') {
      if (a.state === 'glide') return KERERU.mid
      if (a.state === 'dive') return KERERU.dive
      return wingbeat(KERERU, beat)
    }
    if (a.kind === 'gull') return a.state === 'flap' ? wingbeat(GULL, beat) : GULL.glide
    if (a.kind === 'fantail') return a.state === 'perch' ? fan(Math.sin(a.clock * 2.6) ** 2) : beat > 0 ? FANTAIL.up : FANTAIL.down
    if (a.kind === 'bunny') return bunnyPose(a)
    if (a.kind === 'kiwi') return a.state === 'walk' ? (beat > 0 ? KIWI.step : KIWI.stand) : a.ease > 0.5 ? KIWI.probe : KIWI.stand
    if (a.clock % 4.7 < 0.14) return RURU.blink
    return a.ease < -0.5 ? RURU.left : a.ease > 0.5 ? RURU.right : RURU.ahead
  }

  private actor(kind: Kind, x: number, y: number): Actor {
    return { kind, x, y, vx: 0, vy: 0, dir: 1, clock: rand(0, 5), phase: rand(0, TAU), ease: 0, timer: rand(1, 4), state: 'idle', lane: 0, hops: 0 }
  }

  private spawnWalkers() {
    const { width: w } = this.grid
    const walkers = [0.52, 0.63, 0.75].map((u) => {
      const b = this.actor('bunny', w * u + rand(-20, 20), 0)
      b.dir = Math.random() < 0.5 ? -1 : 1
      b.lane = rand(16, 64)
      b.state = 'sit'
      b.phase = 0
      return b
    })
    const kiwi = this.actor('kiwi', w * 0.62, 0)
    kiwi.lane = rand(14, 40)
    walkers.push(kiwi)
    for (const a of walkers) a.y = this.land.landTop(a.x) + a.lane
    this.actors.push(...walkers.sort((a, b) => a.lane - b.lane))
  }

  private spawnFliers(dt: number, night: number) {
    if (night > 0.5) return
    const { width: w, height: h } = this.grid
    this.nextKereru -= dt
    this.nextGulls -= dt
    const kereru = this.actors.filter((a) => a.kind === 'kereru').length
    if (this.nextKereru <= 0 && kereru < 2) {
      const dir = Math.random() < 0.5 ? 1 : -1
      const k = this.actor('kereru', dir > 0 ? -60 : w + 60, h * rand(0.12, 0.34))
      k.dir = dir
      k.vx = dir * rand(42, 60)
      k.state = 'flap'
      this.actors.push(k)
      this.nextKereru = rand(12, 26)
    }
    if (this.nextGulls > 0) return
    const dir = Math.random() < 0.5 ? 1 : -1
    const y = this.land.horizonY - h * rand(0.08, 0.2)
    const count = Math.random() < 0.4 ? 3 : 2
    for (let n = 0; n < count; n++) {
      const g = this.actor('gull', (dir > 0 ? -40 : w + 40) - dir * n * rand(26, 40), y + n * rand(6, 14))
      g.dir = dir
      g.vx = dir * rand(24, 30)
      g.state = 'glide'
      this.actors.push(g)
    }
    this.nextGulls = rand(22, 40)
  }

  /** Kererū alternate heavy wingbeats with glides, and now and then climb steeply, stall and dive. */
  private flyKereru(a: Actor, dt: number) {
    if (a.timer <= 0) this.nextKereruMove(a)
    const low = a.y > this.land.horizonY - this.grid.height * 0.14
    const lift = { flap: low ? -40 : -12, glide: 18, climb: -75, dive: 100 }[a.state] ?? 0
    a.vy = lerp(a.vy, lift, Math.min(1, dt * 2))
    if (a.state === 'flap' || a.state === 'climb') a.phase += dt * TAU * (a.state === 'climb' ? 5 : 4.2)
    a.x += a.vx * dt
    a.y = Math.max(this.grid.height * 0.05, a.y + a.vy * dt)
    this.retireOffscreen(a)
  }

  private nextKereruMove(a: Actor) {
    if (a.state === 'climb') {
      a.state = 'dive'
      a.timer = 0.8
      return
    }
    if (a.state === 'dive') {
      a.state = 'flap'
      a.timer = rand(1, 1.6)
      return
    }
    if (a.state === 'glide' && Math.random() < 0.25 && a.y > this.grid.height * 0.22) {
      a.state = 'climb'
      a.timer = 1.1
      return
    }
    a.state = a.state === 'flap' ? 'glide' : 'flap'
    a.timer = a.state === 'flap' ? rand(1.2, 2.2) : rand(1.4, 2.6)
  }

  private flyGull(a: Actor, dt: number) {
    if (a.timer <= 0) {
      a.state = a.state === 'flap' ? 'glide' : 'flap'
      a.timer = a.state === 'flap' ? rand(0.8, 1.6) : rand(1.5, 3.2)
    }
    if (a.state === 'flap') a.phase += dt * TAU * 2.6
    a.x += a.vx * dt
    a.y += Math.sin(a.clock * 0.8) * 5 * dt
    this.retireOffscreen(a)
  }

  /** Fantails follow walkers to catch the insects they stir up; here the walker is the cursor. */
  private flit(a: Actor, dt: number, pointer: Pointer) {
    const roost = this.land.lookout
    const home = pointer.active ? { x: pointer.x + 24, y: pointer.y - 20 } : roost
    const settled = !pointer.active && Math.hypot(a.x - roost.x, a.y - roost.y) < 5 && Math.hypot(a.vx, a.vy) < 30
    if (settled && a.state !== 'perch') a.timer = rand(2, 5)
    a.state = settled ? 'perch' : 'fly'
    if (a.timer <= 0) {
      a.timer = settled ? rand(2, 5) : rand(0.25, 0.8)
      a.vx += rand(-120, 120)
      a.vy += rand(-90, settled ? -30 : 60)
    }
    const wobble = settled ? 0 : 1
    a.vx += (home.x + Math.sin(a.clock * 1.7) * 18 * wobble - a.x) * 4 * dt
    a.vy += (home.y + Math.cos(a.clock * 2.3) * 10 * wobble - a.y) * 4 * dt
    a.vx *= Math.exp(-3 * dt)
    a.vy *= Math.exp(-3 * dt)
    a.x += a.vx * dt
    a.y += a.vy * dt
    if (Math.abs(a.vx) > 12) a.dir = Math.sign(a.vx)
    if (!settled) a.phase += dt * TAU * 11
  }

  private wander(a: Actor, dt: number) {
    const walking = a.state === 'walk'
    if (a.timer <= 0) {
      a.state = walking ? 'feed' : 'walk'
      a.timer = a.state === 'walk' ? rand(1.5, 4) : rand(3, 8)
      if (a.state === 'walk' && Math.random() < 0.35) a.dir *= -1
    }
    const step = walking ? 13 * dt : 0
    a.x += a.dir * step
    if (walking) a.phase += dt * TAU * 2.6
    a.dir = this.escape(a) || a.dir
    a.ease = lerp(a.ease, walking ? 0 : 1, Math.min(1, dt * 3))
    a.y = this.land.landTop(a.x) + a.lane
  }

  /** Rabbits sit, nibble and look about between short runs of hops, and bolt from a cursor that comes close. */
  private graze(a: Actor, dt: number, pointer: Pointer) {
    if (a.state !== 'bolt' && this.startled(a, pointer)) {
      a.dir = a.x < pointer.x ? -1 : 1
      a.state = 'bolt'
      a.hops = Math.max(a.hops, 5)
    }
    if (a.hops > 0) this.hop(a, dt)
    else if (a.timer <= 0 || this.neighbour(a)) this.rest(a)
    const lift = a.hops > 0 && airborne(a.phase) ? Math.sin((Math.PI * (a.phase - CROUCH)) / (1 - 2 * CROUCH)) * HOP_LIFT : 0
    a.y = this.land.landTop(a.x) + a.lane - lift
  }

  private hop(a: Actor, dt: number) {
    const bolting = a.state === 'bolt'
    const seconds = bolting ? HOP_SECONDS * 0.75 : HOP_SECONDS
    a.phase += dt / seconds
    const step = airborne(a.phase) ? ((bolting ? 1.6 : 1) * HOP_REACH * dt) / (seconds * (1 - 2 * CROUCH)) : 0
    a.x += a.dir * step
    a.dir = this.escape(a) || a.dir
    if (a.phase < 1) return
    a.phase = 0
    a.hops -= 1
    if (a.hops > 0) return
    a.state = bolting ? 'alert' : 'sit'
    a.timer = rand(1.5, 4)
  }

  private rest(a: Actor) {
    a.timer = rand(1.5, 4.5)
    const crowd = this.neighbour(a)
    if (!crowd && Math.random() < 0.6) {
      a.state = RESTS[Math.floor(Math.random() * RESTS.length)]
      return
    }
    a.state = 'hop'
    a.hops = 2 + Math.floor(Math.random() * 4)
    a.phase = 0
    if (crowd) a.dir = a.x < crowd.x ? -1 : 1
    else if (Math.random() < 0.35) a.dir *= -1
  }

  /** Another rabbit close enough to overlap this one. */
  private neighbour(a: Actor) {
    return this.actors.find((b) => b !== a && b.kind === 'bunny' && Math.abs(b.x - a.x) < 44 && Math.abs(b.lane - a.lane) < 22)
  }

  private startled(a: Actor, pointer: Pointer) {
    return pointer.active && Math.abs(pointer.x - a.x) < 90 && Math.abs(pointer.y - (a.y - 20)) < 70
  }

  /** The way back for a walker that strays past the ends of the shore or under the content; 0 when it is clear. */
  private escape(a: Actor) {
    const { width: w } = this.grid
    if (a.x < w * (a.kind === 'kiwi' ? 0.5 : 0.36)) return 1
    if (a.x > w * 0.86) return -1
    const y = this.land.landTop(a.x) + a.lane
    const box = this.avoid.find((b) => a.x + 30 > b.left && a.x - 30 < b.right && y > b.top - 30 && y < b.bottom + 20)
    if (!box) return 0
    return a.x < (box.left + box.right) / 2 ? -1 : 1
  }

  /** The ruru keeps an eye on things, glancing aside now and then. */
  private watch(a: Actor, dt: number) {
    if (a.timer <= 0) {
      a.state = ['left', 'ahead', 'right', 'ahead'][Math.floor(Math.random() * 4)]
      a.timer = rand(2, 5)
    }
    const target = a.state === 'left' ? -1 : a.state === 'right' ? 1 : 0
    a.ease = lerp(a.ease, target, Math.min(1, dt * 6))
  }

  private callOut(dt: number, night: number) {
    const c = this.call
    c.age += dt
    c.wait -= dt
    if (night < 0.9 || c.wait > 0) return
    c.age = 0
    c.wait = rand(14, 26)
  }

  /** "More-pork": two pulses of sound rippling out from the ruru, drawn as dotted arcs. */
  private drawCall(marks: Marks, night: number) {
    const { pitch } = this.grid
    const r = this.ruru
    const cx = r.x - 3 * pitch
    const cy = r.y - 10 * pitch
    for (const delay of [0, 0.5]) {
      const age = this.call.age - delay
      if (age < 0 || age > 1.3) continue
      const radius = 12 + age * 46
      const fade = (1 - age / 1.3) * night
      const rgb = mixRgb(NIGHT, CALL, fade)
      const steps = Math.ceil((radius * 1.1) / pitch)
      for (let k = 0; k <= steps; k++) {
        const angle = Math.PI - 0.55 + (1.1 * k) / steps
        marks.at(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, rgb, 1, fade)
      }
    }
  }

  private retireOffscreen(a: Actor) {
    if (a.x < -140 || a.x > this.grid.width + 140) a.state = 'gone'
  }
}

const airborne = (phase: number) => phase > CROUCH && phase < 1 - CROUCH

function wingbeat(frames: { up: Sprite; mid: Sprite; down: Sprite }, beat: number) {
  if (beat > 0.45) return frames.up
  return beat < -0.45 ? frames.down : frames.mid
}

/** Rabbits crouch to take off and land and stretch out in the air. */
function bunnyPose(a: Actor) {
  if (!a.hops) return BUNNY[a.state as (typeof RESTS)[number]]
  return airborne(a.phase) ? BUNNY.leap : BUNNY.crouch
}

/** Fantails never stop fanning their tails. */
function fan(open: number) {
  if (open > 0.66) return FANTAIL.open
  return open > 0.33 ? FANTAIL.half : FANTAIL.shut
}
