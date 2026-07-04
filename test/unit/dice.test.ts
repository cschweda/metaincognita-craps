import { describe, it, expect } from 'vitest'
import { createSeededRng, rollDice } from '../../app/engine/rng'

describe('rollDice', () => {
  it('maps rng output to dice faces uniformly (exhaustive 36 combos)', () => {
    // Stub rng cycling through 36 evenly spaced values → every (d1,d2) combo exactly once
    const values: number[] = []
    for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) values.push(a / 6 + 0.001, b / 6 + 0.001)
    let i = 0
    const rng = () => values[i++]!
    const seen = new Set<string>()
    for (let n = 0; n < 36; n++) {
      const r = rollDice(rng)
      expect(r.total).toBe(r.die1 + r.die2)
      expect(r.isHard).toBe(r.die1 === r.die2)
      expect(r.die1).toBeGreaterThanOrEqual(1)
      expect(r.die2).toBeLessThanOrEqual(6)
      seen.add(`${r.die1}-${r.die2}`)
    }
    expect(seen.size).toBe(36)
  })

  it('seeded chi-squared uniformity over 100k rolls (deterministic)', () => {
    const rng = createSeededRng(0xC0FFEE)
    const counts = new Array(13).fill(0)
    const N = 100_000
    for (let n = 0; n < N; n++) counts[rollDice(rng).total]++
    // Expected probabilities for totals 2..12 out of 36
    const ways = [0, 0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1]
    let chi2 = 0
    for (let t = 2; t <= 12; t++) {
      const expected = N * ways[t]! / 36
      chi2 += (counts[t]! - expected) ** 2 / expected
    }
    // 10 degrees of freedom, p=0.01 critical value = 23.21.
    // Seeded → this specific value never changes run to run.
    expect(chi2).toBeLessThan(23.21)
  })

  it('same seed reproduces the same sequence', () => {
    const a = createSeededRng(42)
    const b = createSeededRng(42)
    for (let n = 0; n < 100; n++) expect(rollDice(a)).toEqual(rollDice(b))
  })
})
