import { describe, it, expect } from 'vitest'
import type { ActiveBet, TableRules } from '../../app/utils/betTypes'
import {
  applyRatio,
  calculateVig,
  applyPayoutRounding,
  calculatePayout,
  calculateFieldPayout,
  calculateHornHighPayout
} from '../../app/engine/payouts'

// ---- Default table rules for testing ----
const defaultRules: TableRules = {
  minBet: 500,
  maxBet: 50000,
  oddsMultiple: '3-4-5x',
  fieldTwelvePayout: 3,
  buyVigTiming: 'on_win',
  hardwaysOnComeOut: false,
  payoutRounding: 'exact'
}

describe('applyRatio', () => {
  it('$6 Place 6 (7:6) = exactly $7 (700 cents)', () => {
    // 600 cents * 7/6 = 700 cents exactly
    expect(applyRatio(600, [7, 6])).toBe(700)
  })

  it('$5 Place 6 (7:6) = $5 (floor of 583.33)', () => {
    // 500 cents * 7/6 = 583.333... → floor to 583
    expect(applyRatio(500, [7, 6])).toBe(583)
  })

  it('Pass Odds on 5 ($30, 3:2) = $45', () => {
    // 3000 cents * 3/2 = 4500 cents = $45
    expect(applyRatio(3000, [3, 2])).toBe(4500)
  })

  it('Don\'t Pass Odds on 4 ($10, 1:2) = $5', () => {
    // 1000 cents * 1/2 = 500 cents = $5
    expect(applyRatio(1000, [1, 2])).toBe(500)
  })
})

describe('calculateVig', () => {
  it('5% of $20 (2000 cents) = $1 (100 cents)', () => {
    expect(calculateVig(2000)).toBe(100)
  })

  it('5% of $25 (2500 cents) = $1.25 (125 cents, floor)', () => {
    expect(calculateVig(2500)).toBe(125)
  })
})

describe('applyPayoutRounding', () => {
  it('dollar rounding: 583 cents rounds down to 500', () => {
    expect(applyPayoutRounding(583, 'dollar')).toBe(500)
  })

  it('dollar rounding: 700 cents stays 700', () => {
    expect(applyPayoutRounding(700, 'dollar')).toBe(700)
  })

  it('quarter rounding: 583 cents rounds down to 575 (23*25)', () => {
    expect(applyPayoutRounding(583, 'quarter')).toBe(575)
  })

  it('quarter rounding: 700 stays 700', () => {
    expect(applyPayoutRounding(700, 'quarter')).toBe(700)
  })

  it('exact mode: 583 stays 583', () => {
    expect(applyPayoutRounding(583, 'exact')).toBe(583)
  })
})

describe('Field payouts', () => {
  it('field 2 pays 2:1 (default config)', () => {
    // $10 bet on field, roll 2. Ratio is [2,1].
    // Payout = 1000 + applyRatio(1000, [2,1]) = 1000 + 2000 = 3000
    const payout = calculateFieldPayout(1000, 2, defaultRules)
    expect(payout).toBe(3000)
  })

  it('field 12 pays 3:1 (fieldTwelvePayout=3)', () => {
    // $10 bet on field, roll 12. Ratio is [3,1].
    // Payout = 1000 + applyRatio(1000, [3,1]) = 1000 + 3000 = 4000
    const payout = calculateFieldPayout(1000, 12, defaultRules)
    expect(payout).toBe(4000)
  })

  it('field 12 pays 2:1 when fieldTwelvePayout=2', () => {
    const rules: TableRules = { ...defaultRules, fieldTwelvePayout: 2 }
    const payout = calculateFieldPayout(1000, 12, rules)
    expect(payout).toBe(3000)
  })

  it('field 4 pays 1:1', () => {
    // $10 bet on field, roll 4. Ratio is [1,1].
    // Payout = 1000 + 1000 = 2000
    const payout = calculateFieldPayout(1000, 4, defaultRules)
    expect(payout).toBe(2000)
  })

  it('field 9 pays 1:1', () => {
    const payout = calculateFieldPayout(1000, 9, defaultRules)
    expect(payout).toBe(2000)
  })

  it('non-field number returns 0 (no payout)', () => {
    // 7 is not a field number
    const payout = calculateFieldPayout(1000, 7, defaultRules)
    expect(payout).toBe(0)
  })
})

describe('Buy bet payout with vig on win', () => {
  it('Buy 4, $20 bet, vig on win: true odds 2:1 minus 5% vig on winnings', () => {
    const bet: ActiveBet = {
      id: 'test-buy',
      type: 'buy4',
      owner: 'player1',
      amount: 2000, // $20
      oddsAmount: 0,
      pointNumber: 4,
      isContract: false,
      isWorking: true,
      status: 'active',
      placedOnRoll: 1,
      resolvedOnRoll: null
    }
    const rules: TableRules = { ...defaultRules, buyVigTiming: 'on_win' }
    // Winnings = applyRatio(2000, [2,1]) = 4000
    // Vig = floor(4000 * 5/100) = 200
    // Total payout = 2000 + 4000 - 200 = 5800
    const payout = calculatePayout(bet, rules)
    expect(payout).toBe(5800)
  })

  it('Buy 4, $20 bet, vig on bet: no vig deducted from payout', () => {
    const bet: ActiveBet = {
      id: 'test-buy',
      type: 'buy4',
      owner: 'player1',
      amount: 2000,
      oddsAmount: 0,
      pointNumber: 4,
      isContract: false,
      isWorking: true,
      status: 'active',
      placedOnRoll: 1,
      resolvedOnRoll: null
    }
    const rules: TableRules = { ...defaultRules, buyVigTiming: 'on_bet' }
    // Winnings = 4000, no vig deducted at payout
    // Total = 2000 + 4000 = 6000
    const payout = calculatePayout(bet, rules)
    expect(payout).toBe(6000)
  })
})

describe('Horn High payout (2 units on the high number, 1 unit on each other)', () => {
  // $5 horn high yo (high = 11), unit = 100 cents
  it('pays the 2-unit portion when the HIGH number hits (roll 11, high 11)', () => {
    // 2 units returned + applyRatio(200, [15,1]) = 200 + 3000 = 3200
    expect(calculateHornHighPayout(500, 11, 11)).toBe(3200)
  })

  it('pays only the 1-unit portion when a LOW number hits (roll 12, high 11)', () => {
    // 1 unit returned + applyRatio(100, [30,1]) = 100 + 3000 = 3100
    expect(calculateHornHighPayout(500, 12, 11)).toBe(3100)
  })

  it('roll 2 with high 2 pays the doubled portion', () => {
    // 200 + applyRatio(200, [30,1]) = 200 + 6000 = 6200
    expect(calculateHornHighPayout(500, 2, 2)).toBe(6200)
  })

  it('non-horn total pays 0', () => {
    expect(calculateHornHighPayout(500, 7, 11)).toBe(0)
  })
})
