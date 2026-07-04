import { describe, it, expect } from 'vitest'
import type { ActiveBet, TableRules } from '../../app/utils/betTypes'
import { canRemoveBet, getDefaultWorking } from '../../app/engine/betting'

function makeBet(overrides: Partial<ActiveBet> & Pick<ActiveBet, 'type'>): ActiveBet {
  return {
    id: 'b1', owner: 'hero', amount: 1000, oddsAmount: 0,
    pointNumber: null, isContract: false, isWorking: true,
    status: 'active', placedOnRoll: 1, resolvedOnRoll: null,
    ...overrides
  }
}

describe('canRemoveBet', () => {
  it('BLOCKS removing a Pass bet once the table point is established (H1 regression)', () => {
    // Pass bets never get pointNumber set — the table point is the contract trigger
    const bet = makeBet({ type: 'pass', isContract: true, pointNumber: null })
    expect(canRemoveBet(bet, 6).allowed).toBe(false)
  })

  it('allows removing a Pass bet on come-out (no point yet)', () => {
    const bet = makeBet({ type: 'pass', isContract: true })
    expect(canRemoveBet(bet, null).allowed).toBe(true)
  })

  it('blocks removing an established Come bet', () => {
    const bet = makeBet({ type: 'come', isContract: true, pointNumber: 8 })
    expect(canRemoveBet(bet, 6).allowed).toBe(false)
  })

  it('allows removing a pending Come bet (no come point yet)', () => {
    const bet = makeBet({ type: 'come', pointNumber: null })
    expect(canRemoveBet(bet, 6).allowed).toBe(true)
  })

  it('allows removing non-contract bets anytime', () => {
    expect(canRemoveBet(makeBet({ type: 'place6', pointNumber: 6 }), 6).allowed).toBe(true)
    expect(canRemoveBet(makeBet({ type: 'field' }), 6).allowed).toBe(true)
    expect(canRemoveBet(makeBet({ type: 'dontPass' }), 6).allowed).toBe(true)
    expect(canRemoveBet(makeBet({ type: 'dontCome', pointNumber: 9 }), 6).allowed).toBe(true)
  })
})

const rules: TableRules = {
  minBet: 500,
  maxBet: 50000,
  oddsMultiple: '3-4-5x',
  fieldTwelvePayout: 3,
  buyVigTiming: 'on_win',
  hardwaysOnComeOut: false,
  payoutRounding: 'exact'
}

describe('getDefaultWorking', () => {
  it('place/buy/pass-odds/come-odds are OFF on come-out', () => {
    expect(getDefaultWorking('place6', 'COME_OUT', rules)).toBe(false)
    expect(getDefaultWorking('buy4', 'COME_OUT', rules)).toBe(false)
    expect(getDefaultWorking('passOdds', 'COME_OUT', rules)).toBe(false)
    expect(getDefaultWorking('comeOdds', 'COME_OUT', rules)).toBe(false)
  })

  it('hardways on come-out follow the hardwaysOnComeOut table rule', () => {
    expect(getDefaultWorking('hard8', 'COME_OUT', rules)).toBe(false)
    expect(getDefaultWorking('hard8', 'COME_OUT', { ...rules, hardwaysOnComeOut: true })).toBe(true)
  })

  it('everything works during the point phase', () => {
    expect(getDefaultWorking('place6', 'POINT_PHASE', rules)).toBe(true)
    expect(getDefaultWorking('hard8', 'POINT_PHASE', rules)).toBe(true)
  })

  it('lay bets and dont-side odds always work', () => {
    expect(getDefaultWorking('lay4', 'COME_OUT', rules)).toBe(true)
    expect(getDefaultWorking('dontPassOdds', 'COME_OUT', rules)).toBe(true)
  })
})
