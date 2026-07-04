import { describe, it, expect } from 'vitest'
import type { ActiveBet, BetResolution, DiceRoll, TableRules } from '../../app/utils/betTypes'
import { resolveRoll } from '../../app/engine/resolution'

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
    ...overrides
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
      makeBet('big8', { type: 'big8', amount: 500 })
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
      makeBet('any7', { type: 'any7', amount: 500 })
    ]
    const roll: DiceRoll = { die1: 3, die2: 4, total: 7, isHard: false }
    const resolutions = resolveRoll(roll, bets, 'POINT_PHASE', defaultTableRules, 6)
    // All 3 bets should have a resolution
    expect(resolutions).toHaveLength(3)
  })
})
