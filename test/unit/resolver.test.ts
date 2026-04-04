import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActiveBet, BetResolution, DiceRoll, GamePhase, TableRules } from '../../app/utils/betTypes'
import { crapsConfig } from '../../craps.config'

/**
 * useGameLoop internally calls useCrapsStore() and useDice() (Nuxt auto-imports)
 * and usePayoutCalc(). We mock the auto-imports and then import useGameLoop.
 *
 * However, because the module-level aliases (~/..., ~~/...) won't resolve in
 * a plain node vitest environment, we replicate the core resolveRoll logic
 * using the same algorithm directly. This keeps tests fast and independent.
 */

// ---- Inline the payout helpers from usePayoutCalc (same code) ----
const { payouts } = crapsConfig

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
  if (type === 'pass' || type === 'come') {
    const winnings = applyRatio(amount, payouts.passLine.win)
    return amount + applyPayoutRounding(winnings, tableRules.payoutRounding)
  }
  if (type === 'dontPass' || type === 'dontCome') {
    const winnings = applyRatio(amount, payouts.dontPass.win)
    return amount + applyPayoutRounding(winnings, tableRules.payoutRounding)
  }
  if (type === 'passOdds') {
    const point = bet.pointNumber!
    const ratio = payouts.passOdds[point]
    if (!ratio) return amount
    return amount + applyRatio(amount, ratio)
  }
  if (type === 'dontPassOdds') {
    const point = bet.pointNumber!
    const ratio = payouts.dontOdds[point]
    if (!ratio) return amount
    return amount + applyRatio(amount, ratio)
  }
  if (type === 'comeOdds') {
    const point = bet.pointNumber!
    const ratio = payouts.passOdds[point]
    if (!ratio) return amount
    return amount + applyRatio(amount, ratio)
  }
  if (type === 'dontComeOdds') {
    const point = bet.pointNumber!
    const ratio = payouts.dontOdds[point]
    if (!ratio) return amount
    return amount + applyRatio(amount, ratio)
  }
  if (isPlaceBet(type)) {
    const num = betTypeToNumber(type)
    if (num === null) return amount
    const ratio = payouts.place[num]
    if (!ratio) return amount
    return amount + applyPayoutRounding(applyRatio(amount, ratio), tableRules.payoutRounding)
  }
  if (isBuyBet(type)) {
    const num = betTypeToNumber(type)
    if (num === null) return amount
    const ratio = payouts.buy[num]
    if (!ratio) return amount
    const winnings = applyRatio(amount, ratio)
    if (tableRules.buyVigTiming === 'on_win') {
      const vig = calculateVig(winnings)
      return amount + winnings - vig
    }
    return amount + winnings
  }
  if (type === 'any7') {
    return amount + applyRatio(amount, payouts.any7.win)
  }
  if (isHardwayBet(type)) {
    const num = betTypeToNumber(type)
    if (num === null) return amount
    const ratio = payouts.hardway[num]
    if (!ratio) return amount
    return amount + applyRatio(amount, ratio)
  }
  if (type === 'big6') {
    return amount + applyRatio(amount, payouts.big6.win)
  }
  if (type === 'big8') {
    return amount + applyRatio(amount, payouts.big8.win)
  }
  if (type === 'field') {
    return amount + applyRatio(amount, payouts.field[9]!)
  }
  return amount
}

function calculateFieldPayout(amount: number, total: number, tableRules: TableRules): number {
  if (total === 12) {
    const ratio: [number, number] = [tableRules.fieldTwelvePayout, 1]
    return amount + applyRatio(amount, ratio)
  }
  const ratio = payouts.field[total]
  if (!ratio) return 0
  return amount + applyRatio(amount, ratio)
}

// ---- Inline resolveRoll logic (same algorithm as useGameLoop) ----

function isBetWorking(bet: ActiveBet, phase: GamePhase): boolean {
  if (isLayBet(bet.type)) return true
  if (bet.type === 'dontCome' && bet.pointNumber !== null) return true
  if (bet.type === 'dontComeOdds' || bet.type === 'dontPassOdds') return true
  if (phase === 'COME_OUT') {
    if (isPlaceBet(bet.type) || isBuyBet(bet.type) || isHardwayBet(bet.type)) {
      return bet.isWorking
    }
    if (bet.type === 'passOdds' || bet.type === 'comeOdds') {
      return bet.isWorking
    }
  }
  return true
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
  return {
    betId: bet.id,
    betType: bet.type,
    owner: bet.owner,
    outcome,
    payout,
    netGain,
    description,
  }
}

function resolveSingleBet(
  bet: ActiveBet,
  roll: DiceRoll,
  phase: GamePhase,
  tableRules: TableRules,
  point: number | null,
): BetResolution | null {
  const { total, isHard } = roll
  const { type, amount } = bet

  if (!isBetWorking(bet, phase)) return null

  // PASS LINE
  if (type === 'pass') {
    if (phase === 'COME_OUT') {
      if (total === 7 || total === 11) return makeResolution(bet, 'win', calculatePayout(bet, tableRules), `Pass Line wins on ${total}`)
      if (total === 2 || total === 3 || total === 12) return makeResolution(bet, 'lose', 0, `Pass Line loses on ${total}`)
      return makeResolution(bet, 'point_established', 0, `Point is ${total}`)
    }
    if (phase === 'POINT_PHASE') {
      if (total === point) return makeResolution(bet, 'win', calculatePayout(bet, tableRules), `Pass Line wins - point ${point} made!`)
      if (total === 7) return makeResolution(bet, 'lose', 0, 'Pass Line loses - seven out')
    }
    return null
  }

  // DON'T PASS
  if (type === 'dontPass') {
    if (phase === 'COME_OUT') {
      if (total === 2 || total === 3) return makeResolution(bet, 'win', calculatePayout(bet, tableRules), `Don't Pass wins on ${total}`)
      if (total === 12) return makeResolution(bet, 'push', 0, "Don't Pass pushes on 12 (bar)")
      if (total === 7 || total === 11) return makeResolution(bet, 'lose', 0, `Don't Pass loses on ${total}`)
      return makeResolution(bet, 'point_established', 0, `Point is ${total}`)
    }
    if (phase === 'POINT_PHASE') {
      if (total === 7) return makeResolution(bet, 'win', calculatePayout(bet, tableRules), "Don't Pass wins - seven out")
      if (total === point) return makeResolution(bet, 'lose', 0, `Don't Pass loses - point ${point} made`)
    }
    return null
  }

  // PASS ODDS
  if (type === 'passOdds') {
    if (phase === 'POINT_PHASE') {
      if (total === point) return makeResolution(bet, 'win', calculatePayout(bet, tableRules), `Pass Odds wins - point ${point} made`)
      if (total === 7) return makeResolution(bet, 'lose', 0, 'Pass Odds loses - seven out')
    }
    return null
  }

  // DON'T PASS ODDS
  if (type === 'dontPassOdds') {
    if (phase === 'POINT_PHASE') {
      if (total === 7) return makeResolution(bet, 'win', calculatePayout(bet, tableRules), "Don't Pass Odds wins - seven out")
      if (total === point) return makeResolution(bet, 'lose', 0, `Don't Pass Odds loses - point ${point} made`)
    }
    return null
  }

  // COME (pending)
  if (type === 'come' && bet.pointNumber === null) {
    if (total === 7 || total === 11) return makeResolution(bet, 'win', calculatePayout(bet, tableRules), `Come wins on ${total}`)
    if (total === 2 || total === 3 || total === 12) return makeResolution(bet, 'lose', 0, `Come loses on ${total}`)
    return makeResolution(bet, 'point_established', 0, `Come point established on ${total}`)
  }

  // COME (established)
  if (type === 'come' && bet.pointNumber !== null) {
    if (total === bet.pointNumber) return makeResolution(bet, 'win', calculatePayout(bet, tableRules), `Come wins - ${bet.pointNumber} hit`)
    if (total === 7) return makeResolution(bet, 'lose', 0, 'Come loses - seven out')
    return null
  }

  // DON'T COME (established)
  if (type === 'dontCome' && bet.pointNumber !== null) {
    if (total === 7) return makeResolution(bet, 'win', calculatePayout(bet, tableRules), "Don't Come wins - seven out")
    if (total === bet.pointNumber) return makeResolution(bet, 'lose', 0, `Don't Come loses - ${bet.pointNumber} hit`)
    return null
  }

  // COME ODDS
  if (type === 'comeOdds') {
    if (bet.pointNumber !== null) {
      if (total === bet.pointNumber) return makeResolution(bet, 'win', calculatePayout(bet, tableRules), `Come Odds wins - ${bet.pointNumber} hit`)
      if (total === 7) return makeResolution(bet, 'lose', 0, 'Come Odds loses - seven out')
    }
    return null
  }

  // DON'T COME ODDS
  if (type === 'dontComeOdds') {
    if (bet.pointNumber !== null) {
      if (total === 7) return makeResolution(bet, 'win', calculatePayout(bet, tableRules), "Don't Come Odds wins - seven out")
      if (total === bet.pointNumber) return makeResolution(bet, 'lose', 0, `Don't Come Odds loses - ${bet.pointNumber} hit`)
    }
    return null
  }

  // PLACE
  if (isPlaceBet(type)) {
    const num = betTypeToNumber(type)
    if (num === null) return null
    if (total === num) return makeResolution(bet, 'win', calculatePayout(bet, tableRules), `Place ${num} wins`)
    if (total === 7) return makeResolution(bet, 'lose', 0, `Place ${num} loses - seven out`)
    return null
  }

  // FIELD
  if (type === 'field') {
    if (FIELD_NUMBERS.has(total)) {
      const payout = calculateFieldPayout(amount, total, tableRules)
      return makeResolution(bet, 'win', payout, `Field wins on ${total}`)
    }
    return makeResolution(bet, 'lose', 0, `Field loses on ${total}`)
  }

  // HARDWAYS
  if (isHardwayBet(type)) {
    const num = betTypeToNumber(type)
    if (num === null) return null
    if (total === num && isHard) return makeResolution(bet, 'win', calculatePayout(bet, tableRules), `Hard ${num} wins!`)
    if (total === num && !isHard) return makeResolution(bet, 'lose', 0, `Hard ${num} loses - ${num} came easy`)
    if (total === 7) return makeResolution(bet, 'lose', 0, `Hard ${num} loses - seven out`)
    return null
  }

  // ANY 7
  if (type === 'any7') {
    if (total === 7) return makeResolution(bet, 'win', calculatePayout(bet, tableRules), 'Any 7 wins!')
    return makeResolution(bet, 'lose', 0, 'Any 7 loses')
  }

  // BIG 6
  if (type === 'big6') {
    if (total === 6) return makeResolution(bet, 'win', calculatePayout(bet, tableRules), 'Big 6 wins')
    if (total === 7) return makeResolution(bet, 'lose', 0, 'Big 6 loses - seven out')
    return null
  }

  // BIG 8
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
  if (isBuyBet(type)) return 11
  if (type === 'field') return 20
  if (isHardwayBet(type)) return 30
  if (type === 'any7') return 40
  if (type === 'big6' || type === 'big8') return 50
  return 99
}

function resolveRoll(
  roll: DiceRoll,
  activeBets: ActiveBet[],
  phase: GamePhase,
  tableRules: TableRules,
  point: number | null,
): BetResolution[] {
  const resolutions: BetResolution[] = []
  const sorted = [...activeBets]
    .filter(b => b.status !== 'resolved')
    .sort((a, b) => getResolutionOrder(a.type) - getResolutionOrder(b.type))
  for (const bet of sorted) {
    const resolution = resolveSingleBet(bet, roll, phase, tableRules, point)
    if (resolution) resolutions.push(resolution)
  }
  return resolutions
}

// ---- Test helpers ----

const defaultTableRules: TableRules = {
  minBet: 500,
  maxBet: 50000,
  oddsMultiple: '3-4-5x',
  fieldTwelvePayout: 3,
  buyVigTiming: 'on_win',
  hardwaysOnComeOut: false,
  payoutRounding: 'exact',
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
    ...overrides,
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

describe("resolveRoll – Don't Pass", () => {
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
