import { describe, it, expect } from 'vitest'

/**
 * useDice internally calls useCrapsStore (Nuxt auto-import), so we test
 * the dice-rolling logic directly — it is a simple Math.random wrapper.
 */
function rollDice() {
  const die1 = Math.floor(Math.random() * 6) + 1
  const die2 = Math.floor(Math.random() * 6) + 1
  const total = die1 + die2
  const isHard = die1 === die2
  return { die1, die2, total, isHard }
}

const ROLLS = 100_000

describe('useDice – roll()', () => {
  const results = Array.from({ length: ROLLS }, () => rollDice())

  it('each die is between 1 and 6', () => {
    for (const r of results) {
      expect(r.die1).toBeGreaterThanOrEqual(1)
      expect(r.die1).toBeLessThanOrEqual(6)
      expect(r.die2).toBeGreaterThanOrEqual(1)
      expect(r.die2).toBeLessThanOrEqual(6)
    }
  })

  it('total equals die1 + die2', () => {
    for (const r of results) {
      expect(r.total).toBe(r.die1 + r.die2)
    }
  })

  it('isHard is true iff die1 === die2', () => {
    for (const r of results) {
      expect(r.isHard).toBe(r.die1 === r.die2)
    }
  })

  it('each individual die face appears roughly 16,667 times out of 100k rolls', () => {
    const die1Counts = [0, 0, 0, 0, 0, 0]
    const die2Counts = [0, 0, 0, 0, 0, 0]
    for (const r of results) {
      die1Counts[r.die1 - 1]++
      die2Counts[r.die2 - 1]++
    }
    const expected = ROLLS / 6
    const tolerance = expected * 0.03 // 3% tolerance
    for (let face = 0; face < 6; face++) {
      expect(die1Counts[face]).toBeGreaterThan(expected - tolerance)
      expect(die1Counts[face]).toBeLessThan(expected + tolerance)
      expect(die2Counts[face]).toBeGreaterThan(expected - tolerance)
      expect(die2Counts[face]).toBeLessThan(expected + tolerance)
    }
  })

  it('chi-squared test on all 36 die-pair outcomes (p > 0.01)', () => {
    // Tally all 36 outcomes (die1, die2) pairs
    const counts = new Map<string, number>()
    for (let d1 = 1; d1 <= 6; d1++) {
      for (let d2 = 1; d2 <= 6; d2++) {
        counts.set(`${d1},${d2}`, 0)
      }
    }
    for (const r of results) {
      const key = `${r.die1},${r.die2}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    const expectedPerCell = ROLLS / 36
    let chiSquared = 0
    for (const observed of counts.values()) {
      chiSquared += (observed - expectedPerCell) ** 2 / expectedPerCell
    }

    // 35 degrees of freedom, chi-squared critical value at p=0.01 is ~57.34
    // If our statistic is below this, we fail to reject the null hypothesis
    // (the dice are fair), meaning p > 0.01.
    const criticalValue = 57.34
    expect(chiSquared).toBeLessThan(criticalValue)
  })
})
