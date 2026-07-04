import { describe, it, expect, beforeEach } from 'vitest'
import type { ActiveBet, BetResolution, DiceRoll, TableRules } from '../../app/utils/betTypes'
import { resolveRoll } from '../../app/engine/resolution'

// ---- Test helpers ----

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

beforeEach(() => {
  betIdCounter = 0
})

// ---- Tests ----

describe('resolveRoll – Pass Line', () => {
  it('wins on come-out 7', () => {
    const bet = makeBet({ type: 'pass' })
    const roll = makeRoll(4, 3) // total 7
    const res = resolveRoll(roll, [bet], 'COME_OUT', defaultTableRules, null)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    expect(r.payout).toBe(2000) // 1000 + 1000
  })

  it('wins on come-out 11', () => {
    const bet = makeBet({ type: 'pass' })
    const roll = makeRoll(5, 6) // total 11
    const res = resolveRoll(roll, [bet], 'COME_OUT', defaultTableRules, null)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    expect(r.payout).toBe(2000)
  })

  it('loses on come-out 2', () => {
    const bet = makeBet({ type: 'pass' })
    const roll = makeRoll(1, 1) // total 2
    const res = resolveRoll(roll, [bet], 'COME_OUT', defaultTableRules, null)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.payout).toBe(0)
    expect(r.netGain).toBe(-1000)
  })

  it('wins when point is hit', () => {
    const bet = makeBet({ type: 'pass' })
    const roll = makeRoll(3, 3) // total 6
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    expect(r.payout).toBe(2000)
  })

  it('loses on seven-out', () => {
    const bet = makeBet({ type: 'pass' })
    const roll = makeRoll(4, 3) // total 7
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.payout).toBe(0)
  })
})

describe('resolveRoll – Don\'t Pass', () => {
  it('wins on come-out 2', () => {
    const bet = makeBet({ type: 'dontPass' })
    const roll = makeRoll(1, 1) // total 2
    const res = resolveRoll(roll, [bet], 'COME_OUT', defaultTableRules, null)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    expect(r.payout).toBe(2000)
  })

  it('pushes on come-out 12 (bar)', () => {
    const bet = makeBet({ type: 'dontPass' })
    const roll = makeRoll(6, 6) // total 12
    const res = resolveRoll(roll, [bet], 'COME_OUT', defaultTableRules, null)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('push')
    expect(r.payout).toBe(0)
    expect(r.netGain).toBe(0)
  })
})

describe('resolveRoll – Field', () => {
  it('wins on 2 (pays 2:1)', () => {
    const bet = makeBet({ type: 'field' })
    const roll = makeRoll(1, 1) // total 2
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    // 2:1 on field 2 → 1000 + 2000 = 3000
    expect(r.payout).toBe(3000)
  })

  it('wins on 12 (pays 3:1 with default rules)', () => {
    const bet = makeBet({ type: 'field' })
    const roll = makeRoll(6, 6) // total 12
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    // 3:1 on field 12 → 1000 + 3000 = 4000
    expect(r.payout).toBe(4000)
  })

  it('wins on 4 (pays 1:1)', () => {
    const bet = makeBet({ type: 'field' })
    const roll = makeRoll(2, 2) // total 4
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    expect(r.payout).toBe(2000)
  })

  it('loses on 7', () => {
    const bet = makeBet({ type: 'field' })
    const roll = makeRoll(4, 3) // total 7
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.payout).toBe(0)
  })
})

describe('resolveRoll – Place bets', () => {
  it('Place 6 wins on roll of 6', () => {
    const bet = makeBet({ type: 'place6', pointNumber: 6 })
    const roll = makeRoll(4, 2) // total 6
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 8)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    // Place 6 pays 7:6. applyRatio(1000, [7,6]) = 1166. Payout = 1000 + 1166 = 2166
    expect(r.payout).toBe(2166)
  })

  it('Place 6 loses on 7', () => {
    const bet = makeBet({ type: 'place6', pointNumber: 6 })
    const roll = makeRoll(4, 3) // total 7
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 8)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.payout).toBe(0)
  })
})

describe('resolveRoll – Hardways', () => {
  it('Hard 6 wins on 3+3', () => {
    const bet = makeBet({ type: 'hard6' })
    const roll = makeRoll(3, 3) // total 6, hard
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 8)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    // Hardway 6 pays 9:1. Winnings = 1000*9 = 9000. Payout = 1000 + 9000 = 10000
    expect(r.payout).toBe(10000)
  })

  it('Hard 6 loses on easy 6 (2+4)', () => {
    const bet = makeBet({ type: 'hard6' })
    const roll = makeRoll(2, 4) // total 6, easy
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 8)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.payout).toBe(0)
  })

  it('Hard 6 loses on 7', () => {
    const bet = makeBet({ type: 'hard6' })
    const roll = makeRoll(4, 3) // total 7
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 8)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.payout).toBe(0)
  })
})

describe('resolveRoll – Any 7', () => {
  it('wins on 7', () => {
    const bet = makeBet({ type: 'any7' })
    const roll = makeRoll(4, 3) // total 7
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    // Any 7 pays 4:1. Winnings = 4000. Payout = 1000 + 4000 = 5000
    expect(r.payout).toBe(5000)
  })
})

describe('resolveRoll – Come bet pending', () => {
  it('pending Come wins on 7', () => {
    const bet = makeBet({ type: 'come', pointNumber: null })
    const roll = makeRoll(4, 3) // total 7
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    expect(r.payout).toBe(2000)
  })

  it('pending Come loses on 2', () => {
    const bet = makeBet({ type: 'come', pointNumber: null })
    const roll = makeRoll(1, 1) // total 2
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 6)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
  })

  it('pending Come establishes point on 6', () => {
    const bet = makeBet({ type: 'come', pointNumber: null })
    const roll = makeRoll(4, 2) // total 6
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 8)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('point_established')
  })
})

describe('resolveRoll – Big 6', () => {
  it('wins on 6', () => {
    const bet = makeBet({ type: 'big6' })
    const roll = makeRoll(4, 2)
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 8)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('win')
    // Big 6 pays 1:1. Payout = 1000 + 1000 = 2000
    expect(r.payout).toBe(2000)
  })

  it('loses on 7', () => {
    const bet = makeBet({ type: 'big6' })
    const roll = makeRoll(4, 3)
    const res = resolveRoll(roll, [bet], 'POINT_PHASE', defaultTableRules, 8)
    const r = findResolution(res, bet.id)!
    expect(r.outcome).toBe('lose')
    expect(r.payout).toBe(0)
  })
})

describe('resolveRoll – working status (OFF bets take no action)', () => {
  it('OFF place bet does not resolve on its number during point phase', () => {
    const bet = makeBet({ type: 'place6', pointNumber: 6, isWorking: false })
    const res = resolveRoll(makeRoll(4, 2), [bet], 'POINT_PHASE', defaultTableRules, 8)
    expect(res).toHaveLength(0)
  })

  it('OFF place bet does not lose on seven-out', () => {
    const bet = makeBet({ type: 'place8', pointNumber: 8, isWorking: false })
    const res = resolveRoll(makeRoll(4, 3), [bet], 'POINT_PHASE', defaultTableRules, 6)
    expect(res).toHaveLength(0)
  })

  it('OFF hardway does not resolve during point phase', () => {
    const bet = makeBet({ type: 'hard8', isWorking: false })
    const res = resolveRoll(makeRoll(4, 4), [bet], 'POINT_PHASE', defaultTableRules, 6)
    expect(res).toHaveLength(0)
  })

  it('ON place bet still wins during point phase', () => {
    const bet = makeBet({ type: 'place6', pointNumber: 6, isWorking: true })
    const res = resolveRoll(makeRoll(4, 2), [bet], 'POINT_PHASE', defaultTableRules, 8)
    expect(res).toHaveLength(1)
    expect(res[0]!.outcome).toBe('win')
  })

  it('don\'t-side odds are always working regardless of the flag', () => {
    const bet = makeBet({ type: 'dontPassOdds', pointNumber: 6, isWorking: false })
    const res = resolveRoll(makeRoll(4, 3), [bet], 'POINT_PHASE', defaultTableRules, 6)
    expect(res).toHaveLength(1)
    expect(res[0]!.outcome).toBe('win')
  })
})
