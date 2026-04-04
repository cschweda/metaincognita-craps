import { describe, it, expect, beforeEach } from 'vitest'
import type { ActiveBet, BetResolution, DiceRoll, GamePhase, TableRules } from '../../app/utils/betTypes'
import { crapsConfig } from '../../craps.config'

/**
 * Seven-out cascade test: verifies that when a 7 is rolled during POINT_PHASE,
 * all active bets resolve correctly in a single pass.
 *
 * Uses the same inline resolution logic as resolver.test.ts.
 */

const { payouts } = crapsConfig

// ---- Payout helpers ----
function applyRatio(amountCents: number, ratio: [number, number]): number {
  return Math.floor(amountCents * ratio[0] / ratio[1])
}
function calculateVig(amountCents: number): number {
  return Math.floor(amountCents * 5 / 100)
}
function applyPayoutRounding(cents: number, rounding: TableRules['payoutRounding']): number {
  if (rounding === 'dollar') return Math.floor(cents / 100) * 100
  if (rounding === 'quarter') return Math.floor(cents / 25) * 25
  return cents
}
function betTypeToNumber(type: string): number | null {
  const match = type.match(/\d+/)
  return match ? parseInt(match[0]) : null
}
function isPlaceBet(type: string): boolean { return type.startsWith('place') }
function isBuyBet(type: string): boolean { return type.startsWith('buy') }
function isLayBet(type: string): boolean { return type.startsWith('lay') }
function isHardwayBet(type: string): boolean { return type.startsWith('hard') }
const FIELD_NUMBERS = new Set([2, 3, 4, 9, 10, 11, 12])

function calculatePayout(bet: ActiveBet, tableRules: TableRules): number {
  const { type, amount } = bet
  if (type === 'pass' || type === 'come') return amount + applyPayoutRounding(applyRatio(amount, payouts.passLine.win), tableRules.payoutRounding)
  if (type === 'dontPass' || type === 'dontCome') return amount + applyPayoutRounding(applyRatio(amount, payouts.dontPass.win), tableRules.payoutRounding)
  if (type === 'passOdds') { const r = payouts.passOdds[bet.pointNumber!]; return r ? amount + applyRatio(amount, r) : amount }
  if (type === 'dontPassOdds') { const r = payouts.dontOdds[bet.pointNumber!]; return r ? amount + applyRatio(amount, r) : amount }
  if (type === 'comeOdds') { const r = payouts.passOdds[bet.pointNumber!]; return r ? amount + applyRatio(amount, r) : amount }
  if (type === 'dontComeOdds') { const r = payouts.dontOdds[bet.pointNumber!]; return r ? amount + applyRatio(amount, r) : amount }
  if (isPlaceBet(type)) { const n = betTypeToNumber(type); if (!n) return amount; const r = payouts.place[n]; return r ? amount + applyPayoutRounding(applyRatio(amount, r), tableRules.payoutRounding) : amount }
  if (isHardwayBet(type)) { const n = betTypeToNumber(type); if (!n) return amount; const r = payouts.hardway[n]; return r ? amount + applyRatio(amount, r) : amount }
  if (type === 'any7') return amount + applyRatio(amount, payouts.any7.win)
  if (type === 'big6') return amount + applyRatio(amount, payouts.big6.win)
  if (type === 'big8') return amount + applyRatio(amount, payouts.big8.win)
  if (type === 'field') return amount + applyRatio(amount, payouts.field[9]!)
  return amount
}

function calculateFieldPayout(amount: number, total: number, tableRules: TableRules): number {
  if (total === 12) return amount + applyRatio(amount, [tableRules.fieldTwelvePayout, 1])
  const ratio = payouts.field[total]
  if (!ratio) return 0
  return amount + applyRatio(amount, ratio)
}

function isBetWorking(bet: ActiveBet, phase: GamePhase): boolean {
  if (isLayBet(bet.type)) return true
  if (bet.type === 'dontCome' && bet.pointNumber !== null) return true
  if (bet.type === 'dontComeOdds' || bet.type === 'dontPassOdds') return true
  if (phase === 'COME_OUT') {
    if (isPlaceBet(bet.type) || isBuyBet(bet.type) || isHardwayBet(bet.type)) return bet.isWorking
    if (bet.type === 'passOdds' || bet.type === 'comeOdds') return bet.isWorking
  }
  return true
}

function makeResolution(bet: ActiveBet, outcome: BetResolution['outcome'], payout: number, description: string): BetResolution {
  let netGain = 0
  if (outcome === 'win') netGain = payout - bet.amount
  else if (outcome === 'lose') netGain = -bet.amount
  return { betId: bet.id, betType: bet.type, owner: bet.owner, outcome, payout, netGain, description }
}

function resolveSingleBet(bet: ActiveBet, roll: DiceRoll, phase: GamePhase, tableRules: TableRules, point: number | null): BetResolution | null {
  const { total, isHard } = roll
  const { type, amount } = bet
  if (!isBetWorking(bet, phase)) return null

  if (type === 'pass') {
    if (phase === 'POINT_PHASE') {
      if (total === point) return makeResolution(bet, 'win', calculatePayout(bet, tableRules), `Pass Line wins - point ${point} made!`)
      if (total === 7) return makeResolution(bet, 'lose', 0, 'Pass Line loses - seven out')
    }
    return null
  }
  if (type === 'dontPass') {
    if (phase === 'POINT_PHASE') {
      if (total === 7) return makeResolution(bet, 'win', calculatePayout(bet, tableRules), "Don't Pass wins - seven out")
      if (total === point) return makeResolution(bet, 'lose', 0, `Don't Pass loses - point ${point} made`)
    }
    return null
  }
  if (type === 'passOdds') {
    if (phase === 'POINT_PHASE') {
      if (total === point) return makeResolution(bet, 'win', calculatePayout(bet, tableRules), `Pass Odds wins - point ${point} made`)
      if (total === 7) return makeResolution(bet, 'lose', 0, 'Pass Odds loses - seven out')
    }
    return null
  }
  if (type === 'dontPassOdds') {
    if (phase === 'POINT_PHASE') {
      if (total === 7) return makeResolution(bet, 'win', calculatePayout(bet, tableRules), "Don't Pass Odds wins - seven out")
      if (total === point) return makeResolution(bet, 'lose', 0, `Don't Pass Odds loses - point ${point} made`)
    }
    return null
  }
  if (type === 'come' && bet.pointNumber === null) {
    if (total === 7 || total === 11) return makeResolution(bet, 'win', calculatePayout(bet, tableRules), `Come wins on ${total}`)
    if (total === 2 || total === 3 || total === 12) return makeResolution(bet, 'lose', 0, `Come loses on ${total}`)
    return makeResolution(bet, 'point_established', 0, `Come point established on ${total}`)
  }
  if (type === 'come' && bet.pointNumber !== null) {
    if (total === bet.pointNumber) return makeResolution(bet, 'win', calculatePayout(bet, tableRules), `Come wins - ${bet.pointNumber} hit`)
    if (total === 7) return makeResolution(bet, 'lose', 0, 'Come loses - seven out')
    return null
  }
  if (type === 'dontCome' && bet.pointNumber !== null) {
    if (total === 7) return makeResolution(bet, 'win', calculatePayout(bet, tableRules), "Don't Come wins - seven out")
    if (total === bet.pointNumber) return makeResolution(bet, 'lose', 0, `Don't Come loses - ${bet.pointNumber} hit`)
    return null
  }
  if (type === 'comeOdds') {
    if (bet.pointNumber !== null) {
      if (total === bet.pointNumber) return makeResolution(bet, 'win', calculatePayout(bet, tableRules), `Come Odds wins - ${bet.pointNumber} hit`)
      if (total === 7) return makeResolution(bet, 'lose', 0, 'Come Odds loses - seven out')
    }
    return null
  }
  if (type === 'dontComeOdds') {
    if (bet.pointNumber !== null) {
      if (total === 7) return makeResolution(bet, 'win', calculatePayout(bet, tableRules), "Don't Come Odds wins - seven out")
      if (total === bet.pointNumber) return makeResolution(bet, 'lose', 0, `Don't Come Odds loses - ${bet.pointNumber} hit`)
    }
    return null
  }
  if (isPlaceBet(type)) {
    const num = betTypeToNumber(type)
    if (num === null) return null
    if (total === num) return makeResolution(bet, 'win', calculatePayout(bet, tableRules), `Place ${num} wins`)
    if (total === 7) return makeResolution(bet, 'lose', 0, `Place ${num} loses - seven out`)
    return null
  }
  if (type === 'field') {
    if (FIELD_NUMBERS.has(total)) return makeResolution(bet, 'win', calculateFieldPayout(amount, total, tableRules), `Field wins on ${total}`)
    return makeResolution(bet, 'lose', 0, `Field loses on ${total}`)
  }
  if (isHardwayBet(type)) {
    const num = betTypeToNumber(type)
    if (num === null) return null
    if (total === num && isHard) return makeResolution(bet, 'win', calculatePayout(bet, tableRules), `Hard ${num} wins!`)
    if (total === num && !isHard) return makeResolution(bet, 'lose', 0, `Hard ${num} loses - ${num} came easy`)
    if (total === 7) return makeResolution(bet, 'lose', 0, `Hard ${num} loses - seven out`)
    return null
  }
  if (type === 'any7') {
    if (total === 7) return makeResolution(bet, 'win', calculatePayout(bet, tableRules), 'Any 7 wins!')
    return makeResolution(bet, 'lose', 0, 'Any 7 loses')
  }
  if (type === 'big6') {
    if (total === 6) return makeResolution(bet, 'win', calculatePayout(bet, tableRules), 'Big 6 wins')
    if (total === 7) return makeResolution(bet, 'lose', 0, 'Big 6 loses - seven out')
    return null
  }
  if (type === 'big8') {
    if (total === 8) return makeResolution(bet, 'win', calculatePayout(bet, tableRules), 'Big 8 wins')
    if (total === 7) return makeResolution(bet, 'lose', 0, 'Big 8 loses - seven out')
    return null
  }
  return null
}

function getResolutionOrder(type: string): number {
  if (type === 'pass') return 0
  if (type === 'passOdds') return 1
  if (type === 'come') return 2
  if (type === 'comeOdds') return 3
  if (type === 'dontPass') return 4
  if (type === 'dontPassOdds') return 5
  if (type === 'dontCome') return 6
  if (type === 'dontComeOdds') return 7
  if (isPlaceBet(type)) return 10
  if (type === 'field') return 20
  if (isHardwayBet(type)) return 30
  if (type === 'any7') return 40
  if (type === 'big6' || type === 'big8') return 50
  return 99
}

function resolveRoll(roll: DiceRoll, activeBets: ActiveBet[], phase: GamePhase, tableRules: TableRules, point: number | null): BetResolution[] {
  const resolutions: BetResolution[] = []
  const sorted = [...activeBets].filter(b => b.status !== 'resolved').sort((a, b) => getResolutionOrder(a.type) - getResolutionOrder(b.type))
  for (const bet of sorted) {
    const resolution = resolveSingleBet(bet, roll, phase, tableRules, point)
    if (resolution) resolutions.push(resolution)
  }
  return resolutions
}

// ---- Helpers ----

const defaultTableRules: TableRules = {
  minBet: 500,
  maxBet: 50000,
  oddsMultiple: '3-4-5x',
  fieldTwelvePayout: 3,
  buyVigTiming: 'on_win',
  hardwaysOnComeOut: false,
  payoutRounding: 'exact',
}

function makeBet(id: string, overrides: Partial<ActiveBet> & Pick<ActiveBet, 'type'>): ActiveBet {
  return {
    id,
    owner: 'player1',
    amount: 1000,
    oddsAmount: 0,
    pointNumber: null,
    isContract: false,
    isWorking: true,
    status: 'active',
    placedOnRoll: 1,
    resolvedOnRoll: null,
    ...overrides,
  }
}

function find(resolutions: BetResolution[], betId: string): BetResolution {
  const r = resolutions.find(r => r.betId === betId)
  if (!r) throw new Error(`No resolution found for bet ${betId}`)
  return r
}

// ---- Seven-out cascade test ----

describe('Seven-out cascade', () => {
  it('resolves all active bets correctly when 7 is rolled with point=6', () => {
    const TABLE_POINT = 6

    // Build the full bet set
    const bets: ActiveBet[] = [
      makeBet('pass', { type: 'pass', isContract: true }),
      makeBet('passOdds', { type: 'passOdds', amount: 3000, pointNumber: 6 }),
      makeBet('dontPass', { type: 'dontPass' }),
      makeBet('dontPassOdds', { type: 'dontPassOdds', amount: 2000, pointNumber: 6 }),
      // Established Come on 8 with Come Odds
      makeBet('come8', { type: 'come', amount: 1000, pointNumber: 8, isContract: true }),
      makeBet('comeOdds8', { type: 'comeOdds', amount: 2000, pointNumber: 8 }),
      // Established Don't Come on 9
      makeBet('dontCome9', { type: 'dontCome', amount: 1000, pointNumber: 9 }),
      // Pending Come (no point yet)
      makeBet('comePending', { type: 'come', amount: 1000, pointNumber: null }),
      // Place 8 (working)
      makeBet('place8', { type: 'place8', amount: 1200, pointNumber: 8, isWorking: true }),
      // Hard 8 (working)
      makeBet('hard8', { type: 'hard8', amount: 500, isWorking: true }),
      // Field
      makeBet('field', { type: 'field', amount: 500 }),
      // Any 7
      makeBet('any7', { type: 'any7', amount: 500 }),
      // Big 8
      makeBet('big8', { type: 'big8', amount: 500 }),
    ]

    const roll: DiceRoll = { die1: 4, die2: 3, total: 7, isHard: false }
    const resolutions = resolveRoll(roll, bets, 'POINT_PHASE', defaultTableRules, TABLE_POINT)

    // Pass Line loses
    expect(find(resolutions, 'pass').outcome).toBe('lose')
    expect(find(resolutions, 'pass').netGain).toBe(-1000)

    // Pass Odds loses
    expect(find(resolutions, 'passOdds').outcome).toBe('lose')
    expect(find(resolutions, 'passOdds').netGain).toBe(-3000)

    // Don't Pass wins
    const dpRes = find(resolutions, 'dontPass')
    expect(dpRes.outcome).toBe('win')
    expect(dpRes.payout).toBe(2000) // 1000 + 1000 (1:1)

    // Don't Pass Odds wins (point 6, odds 5:6)
    const dpOdds = find(resolutions, 'dontPassOdds')
    expect(dpOdds.outcome).toBe('win')
    // applyRatio(2000, [5,6]) = floor(2000*5/6) = floor(1666.67) = 1666
    // Payout = 2000 + 1666 = 3666
    expect(dpOdds.payout).toBe(3666)

    // Established Come on 8 loses (seven out)
    expect(find(resolutions, 'come8').outcome).toBe('lose')
    expect(find(resolutions, 'come8').netGain).toBe(-1000)

    // Come Odds on 8 loses
    expect(find(resolutions, 'comeOdds8').outcome).toBe('lose')
    expect(find(resolutions, 'comeOdds8').netGain).toBe(-2000)

    // Don't Come on 9 wins (seven out is good for don't side)
    const dc9 = find(resolutions, 'dontCome9')
    expect(dc9.outcome).toBe('win')
    expect(dc9.payout).toBe(2000) // 1:1

    // Pending Come WINS (7 is a natural for pending come bets)
    const comePending = find(resolutions, 'comePending')
    expect(comePending.outcome).toBe('win')
    expect(comePending.payout).toBe(2000) // 1:1

    // Place 8 loses
    expect(find(resolutions, 'place8').outcome).toBe('lose')
    expect(find(resolutions, 'place8').netGain).toBe(-1200)

    // Hard 8 loses
    expect(find(resolutions, 'hard8').outcome).toBe('lose')
    expect(find(resolutions, 'hard8').netGain).toBe(-500)

    // Field loses (7 is not a field number)
    expect(find(resolutions, 'field').outcome).toBe('lose')
    expect(find(resolutions, 'field').netGain).toBe(-500)

    // Any 7 wins
    const any7Res = find(resolutions, 'any7')
    expect(any7Res.outcome).toBe('win')
    // Any 7 pays 4:1. Payout = 500 + 2000 = 2500
    expect(any7Res.payout).toBe(2500)

    // Big 8 loses on 7
    expect(find(resolutions, 'big8').outcome).toBe('lose')
    expect(find(resolutions, 'big8').netGain).toBe(-500)
  })

  it('returns resolutions for every active bet (none skipped)', () => {
    const bets: ActiveBet[] = [
      makeBet('pass', { type: 'pass' }),
      makeBet('field', { type: 'field', amount: 500 }),
      makeBet('any7', { type: 'any7', amount: 500 }),
    ]
    const roll: DiceRoll = { die1: 3, die2: 4, total: 7, isHard: false }
    const resolutions = resolveRoll(roll, bets, 'POINT_PHASE', defaultTableRules, 6)
    // All 3 bets should have a resolution
    expect(resolutions).toHaveLength(3)
  })
})
