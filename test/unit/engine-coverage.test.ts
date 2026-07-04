import { describe, it, expect, beforeEach } from 'vitest'
import type { ActiveBet, BetResolution, DiceRoll, TableRules } from '../../app/utils/betTypes'
import { resolveRoll } from '../../app/engine/resolution'
import {
  applyRatio,
  calculatePayout,
  calculateCEPayout,
  calculateHornPayout,
  calculateHornHighPayout,
  getMaxOdds
} from '../../app/engine/payouts'
import { crapsConfig } from '../../craps.config'

// This file backfills coverage for the ~35 resolveSingleBet bet-type branches
// and the 4 zero-coverage payouts.ts functions identified after Task 5 added
// coverage thresholds. It intentionally does not re-test scenarios already
// covered by resolver.test.ts / seven-out.test.ts / come-lifecycle.test.ts /
// payout.test.ts / transition.test.ts — only the gaps.

// ---- Test helpers (copied from resolver.test.ts per task instructions) ----

const defaultTableRules: TableRules = {
  minBet: 500,
  maxBet: 50000,
  oddsMultiple: '3-4-5x',
  fieldTwelvePayout: 3,
  buyVigTiming: 'on_win',
  hardwaysOnComeOut: false,
  payoutRounding: 'exact'
}

let betIdCounter = 0
function makeBet(overrides: Partial<ActiveBet> & Pick<ActiveBet, 'type'>): ActiveBet {
  betIdCounter++
  return {
    id: `test-${betIdCounter}`,
    owner: 'player1',
    amount: 1000,
    oddsAmount: 0,
    pointNumber: null,
    isContract: false,
    isWorking: true,
    status: 'active',
    placedOnRoll: 1,
    resolvedOnRoll: null,
    ...overrides
  }
}

function makeRoll(die1: number, die2: number): DiceRoll {
  return { die1, die2, total: die1 + die2, isHard: die1 === die2 }
}

function findResolution(resolutions: BetResolution[], betId: string): BetResolution | undefined {
  return resolutions.find(r => r.betId === betId)
}

// C&E ratios in craps.config.ts are known-wrong (a later task corrects them).
// Mirror calculateCEPayout's own formula but read the ratio from config at
// runtime so this test keeps passing once the ratios are fixed.
function expectedCEPayout(amount: number, total: number): number {
  const unitBet = Math.floor(amount / 2)
  const ratio = total === 11 ? crapsConfig.payouts.ce.eleven : crapsConfig.payouts.ce.craps
  return unitBet + applyRatio(unitBet, ratio)
}

beforeEach(() => {
  betIdCounter = 0
})

// ---------------------------------------------------------------------------
// Pass Line — fill gaps (win7/win11/lose2/point-win/seven-out already tested
// in resolver.test.ts)
// ---------------------------------------------------------------------------

describe('resolveRoll – Pass Line (gap fill)', () => {
  it('establishes the point on come-out (e.g. 6)', () => {
    const bet = makeBet({ type: 'pass' })
    const roll = makeRoll(2, 4) // total 6
    const res = resolveRoll(roll, [bet], 'COME_OUT', defaultTableRules, null)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('point_established')
    expect(r.payout).toBe(0)
    expect(r.netGain).toBe(0)
  })

  it('loses on come-out 3', () => {
    const bet = makeBet({ type: 'pass' })
    const roll = makeRoll(1, 2) // total 3
    const res = resolveRoll(roll, [bet], 'COME_OUT', defaultTableRules, null)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.payout).toBe(0)
  })

  it('loses on come-out 12', () => {
    const bet = makeBet({ type: 'pass' })
    const roll = makeRoll(6, 6) // total 12
    const res = resolveRoll(roll, [bet], 'COME_OUT', defaultTableRules, null)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.payout).toBe(0)
  })

  it('has no resolution during point phase on a roll that is neither the point nor 7', () => {
    const bet = makeBet({ type: 'pass' })
    const roll = makeRoll(2, 3) // total 5
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    expect(findResolution(res, bet.id)).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Don't Pass — fill gaps (win-on-2, push-on-12, seven-out-win already tested
// in resolver.test.ts / seven-out.test.ts)
// ---------------------------------------------------------------------------

describe('resolveRoll – Don\'t Pass (gap fill)', () => {
  it('wins on come-out 3', () => {
    const bet = makeBet({ type: 'dontPass' })
    const roll = makeRoll(1, 2) // total 3
    const res = resolveRoll(roll, [bet], 'COME_OUT', defaultTableRules, null)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    // Don't Pass pays 1:1. Payout = 1000 + 1000 = 2000
    expect(r.payout).toBe(2000)
  })

  it('loses on come-out 7', () => {
    const bet = makeBet({ type: 'dontPass' })
    const roll = makeRoll(4, 3) // total 7
    const res = resolveRoll(roll, [bet], 'COME_OUT', defaultTableRules, null)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.netGain).toBe(-1000)
  })

  it('loses on come-out 11', () => {
    const bet = makeBet({ type: 'dontPass' })
    const roll = makeRoll(5, 6) // total 11
    const res = resolveRoll(roll, [bet], 'COME_OUT', defaultTableRules, null)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.netGain).toBe(-1000)
  })

  it('establishes the point on come-out (e.g. 6)', () => {
    const bet = makeBet({ type: 'dontPass' })
    const roll = makeRoll(2, 4) // total 6
    const res = resolveRoll(roll, [bet], 'COME_OUT', defaultTableRules, null)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('point_established')
  })

  it('loses in point phase when the point is made', () => {
    const bet = makeBet({ type: 'dontPass' })
    const roll = makeRoll(2, 4) // total 6
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.netGain).toBe(-1000)
  })

  it('has no resolution during point phase on a roll that is neither 7 nor the point', () => {
    const bet = makeBet({ type: 'dontPass' })
    const roll = makeRoll(2, 3) // total 5
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    expect(findResolution(res, bet.id)).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Pass Odds
// ---------------------------------------------------------------------------

describe('resolveRoll – Pass Odds', () => {
  it('wins when the point is made', () => {
    const bet = makeBet({ type: 'passOdds', pointNumber: 8 })
    const roll = makeRoll(4, 4) // total 8
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 8)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    // Point 8 pays 6:5. applyRatio(1000, [6,5]) = 1200. Payout = 1000 + 1200 = 2200
    expect(r.payout).toBe(2200)
  })

  it('has no resolution when the roll matches neither the point nor 7', () => {
    const bet = makeBet({ type: 'passOdds', pointNumber: 8 })
    const roll = makeRoll(2, 3) // total 5
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 8)
    expect(findResolution(res, bet.id)).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Don't Pass Odds (win-on-seven-out already tested in seven-out.test.ts)
// ---------------------------------------------------------------------------

describe('resolveRoll – Don\'t Pass Odds (gap fill)', () => {
  it('loses when the point is made', () => {
    const bet = makeBet({ type: 'dontPassOdds', pointNumber: 6 })
    const roll = makeRoll(2, 4) // total 6
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.payout).toBe(0)
    expect(r.netGain).toBe(-1000)
  })

  it('has no resolution outside point phase', () => {
    const bet = makeBet({ type: 'dontPassOdds', pointNumber: 6 })
    const roll = makeRoll(4, 3) // total 7
    const res = resolveRoll(roll, [bet], 'COME_OUT', defaultTableRules, null)
    expect(findResolution(res, bet.id)).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Come Odds
// ---------------------------------------------------------------------------

describe('resolveRoll – Come Odds', () => {
  it('wins when its established point is hit', () => {
    const bet = makeBet({ type: 'comeOdds', pointNumber: 9 })
    const roll = makeRoll(4, 5) // total 9
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    // Come Odds uses the pass-odds table. Point 9 pays 3:2. applyRatio(1000,[3,2]) = 1500
    // Payout = 1000 + 1500 = 2500
    expect(r.payout).toBe(2500)
  })

  it('loses on seven-out', () => {
    const bet = makeBet({ type: 'comeOdds', pointNumber: 9 })
    const roll = makeRoll(3, 4) // total 7
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.netGain).toBe(-1000)
  })

  it('has no resolution while still pending (no established point)', () => {
    const bet = makeBet({ type: 'comeOdds', pointNumber: null })
    const roll = makeRoll(3, 4) // total 7
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    expect(findResolution(res, bet.id)).toBeUndefined()
  })

  it('has no resolution when the roll matches neither its point nor 7', () => {
    const bet = makeBet({ type: 'comeOdds', pointNumber: 9 })
    const roll = makeRoll(2, 3) // total 5
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    expect(findResolution(res, bet.id)).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Don't Come Odds (entirely untested before this file)
// ---------------------------------------------------------------------------

describe('resolveRoll – Don\'t Come Odds', () => {
  it('wins on seven-out', () => {
    const bet = makeBet({ type: 'dontComeOdds', pointNumber: 9 })
    const roll = makeRoll(3, 4) // total 7
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    // Don't Come Odds uses the don't-odds table. Point 9 pays 2:3. applyRatio(1000,[2,3]) = 666
    // Payout = 1000 + 666 = 1666
    expect(r.payout).toBe(1666)
  })

  it('loses when its established point is hit', () => {
    const bet = makeBet({ type: 'dontComeOdds', pointNumber: 9 })
    const roll = makeRoll(4, 5) // total 9
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.netGain).toBe(-1000)
  })

  it('has no resolution while still pending (no established point)', () => {
    const bet = makeBet({ type: 'dontComeOdds', pointNumber: null })
    const roll = makeRoll(3, 4) // total 7
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    expect(findResolution(res, bet.id)).toBeUndefined()
  })

  it('has no resolution when the roll matches neither its point nor 7', () => {
    const bet = makeBet({ type: 'dontComeOdds', pointNumber: 9 })
    const roll = makeRoll(2, 3) // total 5
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    expect(findResolution(res, bet.id)).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Don't Come — pending (entirely untested before this file; established
// win-on-seven-out already tested in seven-out.test.ts)
// ---------------------------------------------------------------------------

describe('resolveRoll – Don\'t Come pending', () => {
  it('wins on 2', () => {
    const bet = makeBet({ type: 'dontCome', pointNumber: null })
    const roll = makeRoll(1, 1) // total 2
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    // Don't Come pays 1:1. Payout = 1000 + 1000 = 2000
    expect(r.payout).toBe(2000)
  })

  it('wins on 3', () => {
    const bet = makeBet({ type: 'dontCome', pointNumber: null })
    const roll = makeRoll(1, 2) // total 3
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    expect(r.payout).toBe(2000)
  })

  it('pushes on 12 (bar)', () => {
    const bet = makeBet({ type: 'dontCome', pointNumber: null })
    const roll = makeRoll(6, 6) // total 12
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('push')
    expect(r.payout).toBe(0)
    expect(r.netGain).toBe(0)
  })

  it('loses on 7', () => {
    const bet = makeBet({ type: 'dontCome', pointNumber: null })
    const roll = makeRoll(3, 4) // total 7
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.netGain).toBe(-1000)
  })

  it('loses on 11', () => {
    const bet = makeBet({ type: 'dontCome', pointNumber: null })
    const roll = makeRoll(5, 6) // total 11
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.netGain).toBe(-1000)
  })

  it('establishes a point on any other total (e.g. 6)', () => {
    const bet = makeBet({ type: 'dontCome', pointNumber: null })
    const roll = makeRoll(2, 4) // total 6
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('point_established')
    expect(r.payout).toBe(0)
    expect(r.netGain).toBe(0)
  })
})

describe('resolveRoll – Don\'t Come established (gap fill)', () => {
  it('loses when its point is hit', () => {
    const bet = makeBet({ type: 'dontCome', pointNumber: 9 })
    const roll = makeRoll(4, 5) // total 9
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.netGain).toBe(-1000)
  })

  it('has no resolution on an unrelated roll', () => {
    const bet = makeBet({ type: 'dontCome', pointNumber: 9 })
    const roll = makeRoll(2, 3) // total 5
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    expect(findResolution(res, bet.id)).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Place bets (place6 win/lose already tested in resolver.test.ts)
// ---------------------------------------------------------------------------

describe('resolveRoll – Place bets (gap fill)', () => {
  it('has no resolution on an unrelated roll', () => {
    const bet = makeBet({ type: 'place6', pointNumber: 6 })
    const roll = makeRoll(2, 3) // total 5
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 8)
    expect(findResolution(res, bet.id)).toBeUndefined()
  })

  it('is off by default during come-out and produces no resolution even on its number', () => {
    const bet = makeBet({ type: 'place6', pointNumber: 6, isWorking: false })
    const roll = makeRoll(4, 2) // total 6 — would win if working
    const res = resolveRoll(roll, [bet], 'COME_OUT', defaultTableRules, null)
    expect(findResolution(res, bet.id)).toBeUndefined()
  })

  it('resolves during come-out when explicitly toggled on', () => {
    const bet = makeBet({ type: 'place6', pointNumber: 6, isWorking: true })
    const roll = makeRoll(4, 2) // total 6
    const res = resolveRoll(roll, [bet], 'COME_OUT', defaultTableRules, null)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    // Place 6 pays 7:6. applyRatio(1000, [7,6]) = 1166. Payout = 1000 + 1166 = 2166
    expect(r.payout).toBe(2166)
  })
})

// ---------------------------------------------------------------------------
// Buy bets (calculatePayout math already tested in payout.test.ts; here we
// test the resolution routing)
// ---------------------------------------------------------------------------

describe('resolveRoll – Buy bets', () => {
  it('wins on its number', () => {
    const bet = makeBet({ type: 'buy4', pointNumber: 4 })
    const roll = makeRoll(2, 2) // total 4
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 8)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    // Buy 4 true odds 2:1. Winnings = applyRatio(1000,[2,1]) = 2000. Vig on win = floor(2000*0.05) = 100
    // Payout = 1000 + 2000 - 100 = 2900
    expect(r.payout).toBe(2900)
  })

  it('loses on seven-out', () => {
    const bet = makeBet({ type: 'buy4', pointNumber: 4 })
    const roll = makeRoll(3, 4) // total 7
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 8)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.netGain).toBe(-1000)
  })

  it('has no resolution on an unrelated roll', () => {
    const bet = makeBet({ type: 'buy4', pointNumber: 4 })
    const roll = makeRoll(2, 3) // total 5
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 8)
    expect(findResolution(res, bet.id)).toBeUndefined()
  })

  it('is off by default during come-out and produces no resolution even on its number', () => {
    const bet = makeBet({ type: 'buy4', pointNumber: 4, isWorking: false })
    const roll = makeRoll(2, 2) // total 4 — would win if working
    const res = resolveRoll(roll, [bet], 'COME_OUT', defaultTableRules, null)
    expect(findResolution(res, bet.id)).toBeUndefined()
  })

  it('resolves during come-out when explicitly toggled on', () => {
    const bet = makeBet({ type: 'buy4', pointNumber: 4, isWorking: true })
    const roll = makeRoll(2, 2) // total 4
    const res = resolveRoll(roll, [bet], 'COME_OUT', defaultTableRules, null)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    expect(r.payout).toBe(2900)
  })
})

// ---------------------------------------------------------------------------
// Lay bets (entirely untested before this file)
// ---------------------------------------------------------------------------

describe('resolveRoll – Lay bets', () => {
  it('wins on 7 (vig on win)', () => {
    const bet = makeBet({ type: 'lay4', pointNumber: 4 })
    const roll = makeRoll(3, 4) // total 7
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 8)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    // Lay 4 true odds 1:2. Winnings = applyRatio(1000,[1,2]) = 500. Vig on win = floor(500*0.05) = 25
    // Payout = 1000 + 500 - 25 = 1475
    expect(r.payout).toBe(1475)
  })

  it('wins on 7 (vig on bet — no vig deducted from payout)', () => {
    const rules: TableRules = { ...defaultTableRules, buyVigTiming: 'on_bet' }
    const bet = makeBet({ type: 'lay4', pointNumber: 4 })
    const roll = makeRoll(3, 4) // total 7
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', rules, 8)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    // Winnings = 500, no vig deducted. Payout = 1000 + 500 = 1500
    expect(r.payout).toBe(1500)
  })

  it('loses when its number is hit', () => {
    const bet = makeBet({ type: 'lay4', pointNumber: 4 })
    const roll = makeRoll(2, 2) // total 4
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 8)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.netGain).toBe(-1000)
  })

  it('has no resolution on an unrelated roll', () => {
    const bet = makeBet({ type: 'lay4', pointNumber: 4 })
    const roll = makeRoll(2, 3) // total 5
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 8)
    expect(findResolution(res, bet.id)).toBeUndefined()
  })

  it('is always working, even during come-out (unlike Place/Buy)', () => {
    const bet = makeBet({ type: 'lay4', pointNumber: 4, isWorking: false })
    const roll = makeRoll(3, 4) // total 7
    const res = resolveRoll(roll, [bet], 'COME_OUT', defaultTableRules, null)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    expect(r.payout).toBe(1475)
  })
})

// ---------------------------------------------------------------------------
// Hardways (hard6 win/lose-easy/lose-seven already tested in resolver.test.ts)
// ---------------------------------------------------------------------------

describe('resolveRoll – Hardways (gap fill)', () => {
  it('has no resolution on an unrelated roll', () => {
    const bet = makeBet({ type: 'hard6' })
    const roll = makeRoll(3, 6) // total 9
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 8)
    expect(findResolution(res, bet.id)).toBeUndefined()
  })

  it('is off by default during come-out and produces no resolution even on a hard hit', () => {
    const bet = makeBet({ type: 'hard6', isWorking: false })
    const roll = makeRoll(3, 3) // total 6, hard — would win if working
    const res = resolveRoll(roll, [bet], 'COME_OUT', defaultTableRules, null)
    expect(findResolution(res, bet.id)).toBeUndefined()
  })

  it('resolves during come-out when explicitly toggled on', () => {
    const bet = makeBet({ type: 'hard6', isWorking: true })
    const roll = makeRoll(3, 3) // total 6, hard
    const res = resolveRoll(roll, [bet], 'COME_OUT', defaultTableRules, null)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    // Hardway 6 pays 9:1. Winnings = 1000*9 = 9000. Payout = 1000 + 9000 = 10000
    expect(r.payout).toBe(10000)
  })
})

// ---------------------------------------------------------------------------
// One-roll propositions (any7 win already tested in resolver.test.ts)
// ---------------------------------------------------------------------------

describe('resolveRoll – Any 7 (gap fill)', () => {
  it('loses on any other total', () => {
    const bet = makeBet({ type: 'any7' })
    const roll = makeRoll(2, 3) // total 5
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.payout).toBe(0)
  })
})

describe('resolveRoll – Any Craps', () => {
  it('wins on 2, 3, or 12 (pays 7:1)', () => {
    for (const [d1, d2] of [[1, 1], [1, 2], [6, 6]] as const) {
      const bet = makeBet({ type: 'anyCraps' })
      const roll = makeRoll(d1, d2)
      const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
      const r = findResolution(res, bet.id)!
      expect(r.outcome).toBe('win')
      // Any Craps pays 7:1. Winnings = 7000. Payout = 1000 + 7000 = 8000
      expect(r.payout).toBe(8000)
    }
  })

  it('loses on any other total', () => {
    const bet = makeBet({ type: 'anyCraps' })
    const roll = makeRoll(2, 3) // total 5
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.payout).toBe(0)
  })
})

describe('resolveRoll – Aces', () => {
  it('wins on 2 (pays 30:1)', () => {
    const bet = makeBet({ type: 'aces' })
    const roll = makeRoll(1, 1) // total 2
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    // Aces pays 30:1. Winnings = 30000. Payout = 1000 + 30000 = 31000
    expect(r.payout).toBe(31000)
  })

  it('loses on any other total', () => {
    const bet = makeBet({ type: 'aces' })
    const roll = makeRoll(1, 2) // total 3
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.payout).toBe(0)
  })
})

describe('resolveRoll – Boxcars', () => {
  it('wins on 12 (pays 30:1)', () => {
    const bet = makeBet({ type: 'boxcars' })
    const roll = makeRoll(6, 6) // total 12
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    expect(r.payout).toBe(31000)
  })

  it('loses on any other total', () => {
    const bet = makeBet({ type: 'boxcars' })
    const roll = makeRoll(1, 1) // total 2
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.payout).toBe(0)
  })
})

describe('resolveRoll – Ace-Deuce', () => {
  it('wins on 3 (pays 15:1)', () => {
    const bet = makeBet({ type: 'aceDeuce' })
    const roll = makeRoll(1, 2) // total 3
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    // Ace-Deuce pays 15:1. Winnings = 15000. Payout = 1000 + 15000 = 16000
    expect(r.payout).toBe(16000)
  })

  it('loses on any other total', () => {
    const bet = makeBet({ type: 'aceDeuce' })
    const roll = makeRoll(1, 1) // total 2
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.payout).toBe(0)
  })
})

describe('resolveRoll – Yo-Eleven', () => {
  it('wins on 11 (pays 15:1)', () => {
    const bet = makeBet({ type: 'yo' })
    const roll = makeRoll(5, 6) // total 11
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    expect(r.payout).toBe(16000)
  })

  it('loses on any other total', () => {
    const bet = makeBet({ type: 'yo' })
    const roll = makeRoll(3, 4) // total 7
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.payout).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// C&E (craps.config.ts's ce ratios are known-wrong and will be corrected in a
// later task — expected payouts are computed from crapsConfig at runtime, not
// hardcoded, so this test survives that fix unmodified)
// ---------------------------------------------------------------------------

describe('resolveRoll – C&E (crapsEleven)', () => {
  it('wins on 11 (yo unit wins)', () => {
    const bet = makeBet({ type: 'crapsEleven' })
    const roll = makeRoll(5, 6) // total 11
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    expect(r.payout).toBe(expectedCEPayout(1000, 11))
  })

  it('wins on 2 (craps unit wins)', () => {
    const bet = makeBet({ type: 'crapsEleven' })
    const roll = makeRoll(1, 1) // total 2
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    expect(r.payout).toBe(expectedCEPayout(1000, 2))
  })

  it('wins on 3 (craps unit wins)', () => {
    const bet = makeBet({ type: 'crapsEleven' })
    const roll = makeRoll(1, 2) // total 3
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    expect(r.payout).toBe(expectedCEPayout(1000, 3))
  })

  it('wins on 12 (craps unit wins)', () => {
    const bet = makeBet({ type: 'crapsEleven' })
    const roll = makeRoll(6, 6) // total 12
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    expect(r.payout).toBe(expectedCEPayout(1000, 12))
  })

  it('loses on any other total', () => {
    const bet = makeBet({ type: 'crapsEleven' })
    const roll = makeRoll(3, 4) // total 7
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.payout).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Horn (stable payout ratios — exact cents)
// ---------------------------------------------------------------------------

describe('resolveRoll – Horn', () => {
  it('wins on 2 (pays 30:1 on the 2-unit)', () => {
    const bet = makeBet({ type: 'horn', amount: 2000 })
    const roll = makeRoll(1, 1) // total 2
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    // unitBet = floor(2000/4) = 500. Ratio 30:1. unitWin = 15000. Payout = 500 + 15000 = 15500
    expect(r.payout).toBe(15500)
  })

  it('wins on 3 (pays 15:1 on the 3-unit)', () => {
    const bet = makeBet({ type: 'horn', amount: 2000 })
    const roll = makeRoll(1, 2) // total 3
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    // unitBet = 500. Ratio 15:1. unitWin = 7500. Payout = 500 + 7500 = 8000
    expect(r.payout).toBe(8000)
  })

  it('wins on 11 (pays 15:1 on the 11-unit)', () => {
    const bet = makeBet({ type: 'horn', amount: 2000 })
    const roll = makeRoll(5, 6) // total 11
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    expect(r.payout).toBe(8000)
  })

  it('wins on 12 (pays 30:1 on the 12-unit)', () => {
    const bet = makeBet({ type: 'horn', amount: 2000 })
    const roll = makeRoll(6, 6) // total 12
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    expect(r.payout).toBe(15500)
  })

  it('loses on any other total', () => {
    const bet = makeBet({ type: 'horn', amount: 2000 })
    const roll = makeRoll(3, 4) // total 7
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.payout).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Horn High — calculateHornHighPayout currently overpays because it always
// credits the 2-unit "high" portion to whichever number hits (a later task
// changes its signature to (totalBet, total, highNumber) and its math). Only
// test resolution routing (win/lose) and the zero-return for non-horn
// totals — never assert exact hornHigh payout amounts here.
// ---------------------------------------------------------------------------

describe('resolveRoll – Horn High (routing only, no exact payout amounts)', () => {
  it('wins (with a positive payout) on 2, 3, 11, and 12', () => {
    for (const [d1, d2] of [[1, 1], [1, 2], [5, 6], [6, 6]] as const) {
      const bet = makeBet({ type: 'hornHigh', amount: 2500 })
      const roll = makeRoll(d1, d2)
      const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
      const r = findResolution(res, bet.id)!
      expect(r.outcome).toBe('win')
      expect(r.payout).toBeGreaterThan(0)
    }
  })

  it('loses on any other total', () => {
    const bet = makeBet({ type: 'hornHigh', amount: 2500 })
    const roll = makeRoll(3, 4) // total 7
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.payout).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Hop bets (stable payout ratios — exact cents). Hop bets store their target
// number in bet.pointNumber.
// ---------------------------------------------------------------------------

describe('resolveRoll – Hop Hard', () => {
  it('wins when the hard target total is rolled', () => {
    const bet = makeBet({ type: 'hopHard', pointNumber: 4 })
    const roll = makeRoll(2, 2) // total 4, hard
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 8)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    // Hop Hard pays 30:1. Winnings = 30000. Payout = 1000 + 30000 = 31000
    expect(r.payout).toBe(31000)
  })

  it('loses when the target total comes easy', () => {
    const bet = makeBet({ type: 'hopHard', pointNumber: 4 })
    const roll = makeRoll(1, 3) // total 4, easy
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 8)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.payout).toBe(0)
  })

  it('loses when a different hard total is rolled', () => {
    const bet = makeBet({ type: 'hopHard', pointNumber: 4 })
    const roll = makeRoll(3, 3) // total 6, hard
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 8)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.payout).toBe(0)
  })

  it('loses when no target number is set', () => {
    const bet = makeBet({ type: 'hopHard', pointNumber: null })
    const roll = makeRoll(2, 2) // total 4, hard
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 8)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.payout).toBe(0)
  })
})

describe('resolveRoll – Hop Easy', () => {
  it('wins when the easy target total is rolled', () => {
    const bet = makeBet({ type: 'hopEasy', pointNumber: 4 })
    const roll = makeRoll(1, 3) // total 4, easy
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 8)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    // Hop Easy pays 15:1. Winnings = 15000. Payout = 1000 + 15000 = 16000
    expect(r.payout).toBe(16000)
  })

  it('loses when the target total comes hard', () => {
    const bet = makeBet({ type: 'hopEasy', pointNumber: 4 })
    const roll = makeRoll(2, 2) // total 4, hard
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 8)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.payout).toBe(0)
  })

  it('loses when a different easy total is rolled', () => {
    const bet = makeBet({ type: 'hopEasy', pointNumber: 4 })
    const roll = makeRoll(2, 3) // total 5, easy
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 8)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.payout).toBe(0)
  })

  it('loses when no target number is set', () => {
    const bet = makeBet({ type: 'hopEasy', pointNumber: null })
    const roll = makeRoll(1, 3) // total 4, easy
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 8)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.payout).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Big 6 / Big 8 (big6 win/lose and big8 lose-on-seven already tested in
// resolver.test.ts / seven-out.test.ts)
// ---------------------------------------------------------------------------

describe('resolveRoll – Big 8 (gap fill)', () => {
  it('wins on 8', () => {
    const bet = makeBet({ type: 'big8' })
    const roll = makeRoll(4, 4) // total 8
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    // Big 8 pays 1:1. Payout = 1000 + 1000 = 2000
    expect(r.payout).toBe(2000)
  })
})

describe('resolveRoll – Big 6 / Big 8 no-resolution (gap fill)', () => {
  it('Big 6 has no resolution on an unrelated roll', () => {
    const bet = makeBet({ type: 'big6' })
    const roll = makeRoll(2, 3) // total 5
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 8)
    expect(findResolution(res, bet.id)).toBeUndefined()
  })

  it('Big 8 has no resolution on an unrelated roll', () => {
    const bet = makeBet({ type: 'big8' })
    const roll = makeRoll(2, 3) // total 5
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    expect(findResolution(res, bet.id)).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// isBetWorking — the come-out gate for Pass Odds / Come Odds. Pass Odds has
// its own POINT_PHASE check so it never resolves during come-out either way;
// Come Odds has no phase check of its own, so during come-out isWorking is
// the ONLY thing standing between it and a normal resolution.
// ---------------------------------------------------------------------------

describe('resolveRoll – Pass/Come Odds come-out gate', () => {
  it('Pass Odds never resolves during come-out, regardless of isWorking (it has its own phase gate)', () => {
    const working = makeBet({ type: 'passOdds', pointNumber: 6, isWorking: true })
    const off = makeBet({ type: 'passOdds', pointNumber: 6, isWorking: false })
    const roll = makeRoll(4, 3) // total 7
    const res = resolveRoll(roll, [working, off], 'COME_OUT', defaultTableRules, 6)
    expect(findResolution(res, working.id)).toBeUndefined()
    expect(findResolution(res, off.id)).toBeUndefined()
  })

  it('Come Odds is gated purely by isWorking during come-out (no phase check of its own)', () => {
    const working = makeBet({ type: 'comeOdds', pointNumber: 8, isWorking: true })
    const off = makeBet({ type: 'comeOdds', pointNumber: 8, isWorking: false })
    const roll = makeRoll(4, 4) // total 8 — matches the established come point
    const res = resolveRoll(roll, [working, off], 'COME_OUT', defaultTableRules, null)
    // isWorking: true → resolves normally, since comeOdds itself has no phase check
    const r = findResolution(res, working.id)!
    expect(r.outcome).toBe('win')
    expect(r.payout).toBe(2200)
    // isWorking: false → off, no resolution at all
    expect(findResolution(res, off.id)).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// resolveRoll bookkeeping
// ---------------------------------------------------------------------------

describe('resolveRoll – bookkeeping', () => {
  it('excludes already-resolved bets from the output entirely', () => {
    const resolvedBet = makeBet({ type: 'pass', status: 'resolved' })
    const activeBet = makeBet({ type: 'pass' })
    const roll = makeRoll(4, 3) // total 7 — would win for both if evaluated
    const res = resolveRoll(roll, [resolvedBet, activeBet], 'COME_OUT', defaultTableRules, null)
    expect(findResolution(res, resolvedBet.id)).toBeUndefined()
    expect(findResolution(res, activeBet.id)).toBeDefined()
    expect(res).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Direct payouts.ts unit tests (calculateCEPayout, calculateHornPayout,
// calculateHornHighPayout, getMaxOdds had zero direct tests before this file)
// ---------------------------------------------------------------------------

describe('calculateCEPayout (direct)', () => {
  it('total 11 pays the configured eleven ratio on the yo unit', () => {
    expect(calculateCEPayout(1000, 11)).toBe(expectedCEPayout(1000, 11))
  })

  it('total 2, 3, or 12 pays the configured craps ratio on the craps unit', () => {
    expect(calculateCEPayout(1000, 2)).toBe(expectedCEPayout(1000, 2))
    expect(calculateCEPayout(1000, 3)).toBe(expectedCEPayout(1000, 3))
    expect(calculateCEPayout(1000, 12)).toBe(expectedCEPayout(1000, 12))
  })

  it('returns 0 for a total that is neither craps nor eleven', () => {
    expect(calculateCEPayout(1000, 7)).toBe(0)
  })
})

describe('calculateHornPayout (direct, stable ratios)', () => {
  it('pays the 30:1 unit on 2 and 12', () => {
    // unitBet = floor(2000/4) = 500. 30:1 → unitWin 15000. Payout = 500 + 15000 = 15500
    expect(calculateHornPayout(2000, 2)).toBe(15500)
    expect(calculateHornPayout(2000, 12)).toBe(15500)
  })

  it('pays the 15:1 unit on 3 and 11', () => {
    // unitBet = 500. 15:1 → unitWin 7500. Payout = 500 + 7500 = 8000
    expect(calculateHornPayout(2000, 3)).toBe(8000)
    expect(calculateHornPayout(2000, 11)).toBe(8000)
  })

  it('returns 0 for a non-horn total', () => {
    expect(calculateHornPayout(2000, 7)).toBe(0)
  })
})

describe('calculateHornHighPayout (direct — zero-return only, per known-bug constraint)', () => {
  it('returns 0 for a non-horn total', () => {
    expect(calculateHornHighPayout(1000, 7)).toBe(0)
  })
})

describe('getMaxOdds (direct)', () => {
  it('computes flat bet amount times the odds multiple for the point', () => {
    // 3-4-5x: point 6 → 5x. 1000 * 5 = 5000
    expect(getMaxOdds(1000, 6, '3-4-5x')).toBe(5000)
    // 3-4-5x: point 4 → 3x. 1000 * 3 = 3000
    expect(getMaxOdds(1000, 4, '3-4-5x')).toBe(3000)
    // 10x: point 5 → 10x. 2000 * 10 = 20000
    expect(getMaxOdds(2000, 5, '10x')).toBe(20000)
  })

  it('returns 0 for a point number with no configured multiple', () => {
    expect(getMaxOdds(1000, 7, '3-4-5x')).toBe(0)
  })

  it('returns 0 for an unknown odds multiple key', () => {
    expect(getMaxOdds(1000, 6, 'not-a-real-key')).toBe(0)
  })
})

describe('calculatePayout (direct — defensive fallbacks)', () => {
  it('refunds the bet amount when no odds ratio is configured for the point', () => {
    const bet = makeBet({ type: 'passOdds', pointNumber: 7 }) // 7 is not a valid point
    expect(calculatePayout(bet, defaultTableRules)).toBe(1000)
  })

  it('refunds the bet amount for bet types it does not compute (handled by a dedicated payout fn instead)', () => {
    const bet = makeBet({ type: 'field' }) // field uses calculateFieldPayout, not calculatePayout
    expect(calculatePayout(bet, defaultTableRules)).toBe(1000)
  })
})
