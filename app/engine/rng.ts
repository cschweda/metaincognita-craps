import type { DiceRoll } from '../utils/betTypes'

/** Mulberry32 — small, fast, seedable PRNG for reproducible sessions/tests. */
export function createSeededRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a += 0x6D2B79F5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function rollDice(rng: () => number = Math.random): DiceRoll {
  const die1 = Math.floor(rng() * 6) + 1
  const die2 = Math.floor(rng() * 6) + 1
  return { die1, die2, total: die1 + die2, isHard: die1 === die2 }
}
