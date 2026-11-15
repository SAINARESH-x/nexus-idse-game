// Seeded randomness: mulberry32 PRNG plus helpers and a deterministic seed mixer. Never use Math.random in game logic.

export interface Rng {
  /** Uniform float in [0, 1). */
  next: () => number
  /** Uniform integer in [min, max] inclusive. */
  int: (min: number, max: number) => number
  /** Uniform float in [min, max). */
  float: (min: number, max: number) => number
  pick: <T>(items: readonly T[]) => T
  /** New shuffled copy (Fisher-Yates); the input is not mutated. */
  shuffle: <T>(items: readonly T[]) => T[]
  chance: (p: number) => boolean
  /** Normal sample via Box-Muller. */
  normal: (mean?: number, sd?: number) => number
}

/** mulberry32: small, fast, 32-bit state PRNG. Same seed always yields the same stream. */
export function mulberry32(seed: number): Rng {
  let state = seed >>> 0
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (min: number, max: number): number => {
    const lo = Math.ceil(Math.min(min, max))
    const hi = Math.floor(Math.max(min, max))
    return lo + Math.floor(next() * (hi - lo + 1))
  }
  const float = (min: number, max: number): number => min + next() * (max - min)
  const pick = <T,>(items: readonly T[]): T => {
    if (items.length === 0) throw new Error('pick() needs at least one item')
    return items[Math.floor(next() * items.length)]
  }
  const shuffle = <T,>(items: readonly T[]): T[] => {
    const copy = [...items]
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(next() * (i + 1))
      const tmp = copy[i]
      copy[i] = copy[j]
      copy[j] = tmp
    }
    return copy
  }
  const chance = (p: number): boolean => next() < p
  const normal = (mean = 0, sd = 1): number => {
    let u = 0
    while (u === 0) u = next()
    const v = next()
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
  return { next, int, float, pick, shuffle, chance, normal }
}

/** Deterministic 32-bit hash of integer arguments, for deriving sub-seeds (e.g. mixSeed(seed, SALT, run)). */
export function mixSeed(...parts: number[]): number {
  let h = 0x811c9dc5
  for (const part of parts) {
    let value = Math.trunc(Number.isFinite(part) ? part : 0) >>> 0
    for (let i = 0; i < 4; i += 1) {
      h ^= value & 0xff
      h = Math.imul(h, 0x01000193) >>> 0
      value >>>= 8
    }
  }
  // final avalanche
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b) >>> 0
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35) >>> 0
  h ^= h >>> 16
  return h >>> 0
}
