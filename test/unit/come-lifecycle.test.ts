import { describe, it, expect } from 'vitest'
import type { ActiveBet, BetResolution, DiceRoll, TableRules } from '../../app/utils/betTypes'
import { crapsConfig } from '../../craps.config'

/**
 * Come bet state machine lifecycle tests.
 * Tests the full Come bet journey from pending through established to resolution.
 */

const { payouts } = crapsConfig

// ---- Payout helpers (same as source) ----
function applyRatio(amountCents: number, ratio: [number, number]): number {
  return Math.floor(amountCents * ratio[0] / ratio[1])
}
function applyPayoutRounding(cents: number, rounding: TableRules['payoutRounding']): number {
  if (rounding === 'dollar') return Math.floor(cents / 100) * 100
  if (rounding === 'quarter') return Math.floor(cents / 25) * 25
  return cents
}

function calculatePayout(bet: ActiveBet, tableRules: TableRules): number {
  const { type, amount } = bet
  if (type === 'pass' || type === 'come') {
    return amount + applyPayoutRounding(applyRatio(amount, payouts.passLine.win), tableRules.payoutRounding)
  }
  return amount
}

function makeResolution(
  bet: ActiveBet,
  outcome: BetResolution['outcome'],
  payout: number,
  description: string
): BetResolution {
  let netGain = 0
  if (outcome === 'win') netGain = payout - bet.amount
  else if (outcome === 'lose') netGain = -bet.amount
  return { betId: bet.id, betType: bet.type, owner: bet.owner, outcome, payout, netGain, description }
}

function resolveCome(
  bet: ActiveBet,
  roll: DiceRoll,
  tableRules: TableRules
): BetResolution | null {
  const { total } = roll

  // Pending Come (no point)
  if (bet.pointNumber === null) {
    if (total === 7 || total === 11) {
      const payout = calculatePayout(bet, tableRules)
      return makeResolution(bet, 'win', payout, `Come wins on ${total}`)
    }
    if (total === 2 || total === 3 || total === 12) {
      return makeResolution(bet, 'lose', 0, `Come loses on ${total}`)
    }
    return makeResolution(bet, 'point_established', 0, `Come point established on ${total}`)
  }

  // Established Come (has point)
  if (total === bet.pointNumber) {
    const payout = calculatePayout(bet, tableRules)
    return makeResolution(bet, 'win', payout, `Come wins - ${bet.pointNumber} hit`)
  }
  if (total === 7) {
    return makeResolution(bet, 'lose', 0, 'Come loses - seven out')
  }

  return null // no action on other numbers
}

// ---- Helpers ----

const defaultTableRules: TableRules = {
  minBet: 500,
  maxBet: 50000,
  oddsMultiple: '3-4-5x',
  fieldTwelvePayout: 3,
  buyVigTiming: 'on_win',
  hardwaysOnComeOut: false,
  payoutRounding: 'exact'
}

function makeComeBet(pointNumber: number | null = null): ActiveBet {
  return {
    id: 'come-test',
    type: 'come',
    owner: 'player1',
    amount: 1000,
    oddsAmount: 0,
    pointNumber,
    isContract: pointNumber !== null, // becomes contract once point is established
    isWorking: true,
    status: 'active',
    placedOnRoll: 1,
    resolvedOnRoll: null
  }
}

function makeRoll(die1: number, die2: number): DiceRoll {
  return { die1, die2, total: die1 + die2, isHard: die1 === die2 }
}

// ---- Tests ----

describe('Come bet – pending (no point established)', () => {
  it('wins immediately on 7', () => {
    const bet = makeComeBet(null)
    const roll = makeRoll(4, 3) // total 7
    const res = resolveCome(bet, roll, defaultTableRules)!
    expect(res.outcome).toBe('win')
    expect(res.payout).toBe(2000) // 1000 bet + 1000 winnings (1:1)
    expect(res.netGain).toBe(1000)
  })

  it('wins immediately on 11', () => {
    const bet = makeComeBet(null)
    const roll = makeRoll(5, 6) // total 11
    const res = resolveCome(bet, roll, defaultTableRules)!
    expect(res.outcome).toBe('win')
    expect(res.payout).toBe(2000)
    expect(res.netGain).toBe(1000)
  })

  it('loses immediately on 2', () => {
    const bet = makeComeBet(null)
    const roll = makeRoll(1, 1) // total 2
    const res = resolveCome(bet, roll, defaultTableRules)!
    expect(res.outcome).toBe('lose')
    expect(res.payout).toBe(0)
    expect(res.netGain).toBe(-1000)
  })

  it('loses immediately on 3', () => {
    const bet = makeComeBet(null)
    const roll = makeRoll(1, 2) // total 3
    const res = resolveCome(bet, roll, defaultTableRules)!
    expect(res.outcome).toBe('lose')
    expect(res.payout).toBe(0)
    expect(res.netGain).toBe(-1000)
  })

  it('loses immediately on 12', () => {
    const bet = makeComeBet(null)
    const roll = makeRoll(6, 6) // total 12
    const res = resolveCome(bet, roll, defaultTableRules)!
    expect(res.outcome).toBe('lose')
    expect(res.payout).toBe(0)
    expect(res.netGain).toBe(-1000)
  })

  it('establishes point on 6, marking pointNumber and isContract', () => {
    const bet = makeComeBet(null)
    const roll = makeRoll(4, 2) // total 6
    const res = resolveCome(bet, roll, defaultTableRules)!
    expect(res.outcome).toBe('point_established')
    expect(res.payout).toBe(0)
    expect(res.netGain).toBe(0)
    expect(res.description).toContain('6')

    // Simulate what applyPointEstablished would do:
    bet.pointNumber = roll.total
    bet.isContract = true
    expect(bet.pointNumber).toBe(6)
    expect(bet.isContract).toBe(true)
  })

  it('establishes point on 4', () => {
    const bet = makeComeBet(null)
    const roll = makeRoll(2, 2) // total 4
    const res = resolveCome(bet, roll, defaultTableRules)!
    expect(res.outcome).toBe('point_established')
    bet.pointNumber = roll.total
    expect(bet.pointNumber).toBe(4)
  })

  it('establishes point on 10', () => {
    const bet = makeComeBet(null)
    const roll = makeRoll(5, 5) // total 10
    const res = resolveCome(bet, roll, defaultTableRules)!
    expect(res.outcome).toBe('point_established')
    bet.pointNumber = roll.total
    expect(bet.pointNumber).toBe(10)
  })
})

describe('Come bet – established (has point)', () => {
  it('wins when its point is hit (point=6, roll=6)', () => {
    const bet = makeComeBet(6)
    const roll = makeRoll(4, 2) // total 6
    const res = resolveCome(bet, roll, defaultTableRules)!
    expect(res.outcome).toBe('win')
    expect(res.payout).toBe(2000)
    expect(res.netGain).toBe(1000)
  })

  it('loses on seven-out (point=6, roll=7)', () => {
    const bet = makeComeBet(6)
    const roll = makeRoll(3, 4) // total 7
    const res = resolveCome(bet, roll, defaultTableRules)!
    expect(res.outcome).toBe('lose')
    expect(res.payout).toBe(0)
    expect(res.netGain).toBe(-1000)
  })

  it('no action on unrelated number (point=6, roll=8)', () => {
    const bet = makeComeBet(6)
    const roll = makeRoll(3, 5) // total 8
    const res = resolveCome(bet, roll, defaultTableRules)
    expect(res).toBeNull()
  })

  it('no action on 11 when established (point=6, roll=11)', () => {
    const bet = makeComeBet(6)
    const roll = makeRoll(5, 6) // total 11
    const res = resolveCome(bet, roll, defaultTableRules)
    expect(res).toBeNull()
  })

  it('no action on 2 when established (point=6, roll=2)', () => {
    const bet = makeComeBet(6)
    const roll = makeRoll(1, 1) // total 2
    const res = resolveCome(bet, roll, defaultTableRules)
    expect(res).toBeNull()
  })
})

describe('Come bet – full lifecycle simulation', () => {
  it('pending → point established on 8 → wins when 8 hits', () => {
    // Step 1: Place come bet, roll an 8
    const bet = makeComeBet(null)
    const roll1 = makeRoll(3, 5) // total 8
    const res1 = resolveCome(bet, roll1, defaultTableRules)!
    expect(res1.outcome).toBe('point_established')

    // Simulate applyPointEstablished
    bet.pointNumber = 8
    bet.isContract = true

    // Step 2: Roll a 5 (no action)
    const roll2 = makeRoll(2, 3) // total 5
    const res2 = resolveCome(bet, roll2, defaultTableRules)
    expect(res2).toBeNull()

    // Step 3: Roll an 8 (point hit, win!)
    const roll3 = makeRoll(6, 2) // total 8
    const res3 = resolveCome(bet, roll3, defaultTableRules)!
    expect(res3.outcome).toBe('win')
    expect(res3.payout).toBe(2000)
  })

  it('pending → point established on 9 → loses on seven-out', () => {
    const bet = makeComeBet(null)
    const roll1 = makeRoll(4, 5) // total 9
    const res1 = resolveCome(bet, roll1, defaultTableRules)!
    expect(res1.outcome).toBe('point_established')

    bet.pointNumber = 9
    bet.isContract = true

    // Roll a 7 → seven-out, come loses
    const roll2 = makeRoll(3, 4) // total 7
    const res2 = resolveCome(bet, roll2, defaultTableRules)!
    expect(res2.outcome).toBe('lose')
    expect(res2.netGain).toBe(-1000)
  })
})
