/* eslint-disable @typescript-eslint/no-explicit-any -- these tests deliberately corrupt untyped JSON */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCrapsStore } from '../../app/stores/craps'
import type { ActiveBet, BetType, TableRules } from '../../app/utils/betTypes'
import { calculatePayout, getMaxLayOdds, getUpfrontVig } from '../../app/engine/payouts'
import { findOrphanedOdds, resolveOddsTarget } from '../../app/engine/betting'
import { formatCents, formatSignedCents } from '../../app/utils/format'
import { parseSession } from '../../app/utils/session'
import { crapsConfig } from '../../craps.config'

const rules: TableRules = {
  minBet: 1000,
  maxBet: 200000,
  oddsMultiple: '3-4-5x',
  fieldTwelvePayout: 3,
  buyVigTiming: 'on_win',
  hardwaysOnComeOut: false,
  payoutRounding: 'dollar'
}

let n = 0
function bet(type: BetType, amount: number, pointNumber: number | null = null, extra: Partial<ActiveBet> = {}): ActiveBet {
  return {
    id: `bet-${++n}`, type, owner: 'hero', amount, oddsAmount: 0, pointNumber,
    isContract: false, isWorking: true, status: 'active', placedOnRoll: 0, resolvedOnRoll: null,
    ...extra
  }
}

// Minimal localStorage stub for the node environment
const storage = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
  clear: () => storage.clear(),
  key: (i: number) => [...storage.keys()][i] ?? null,
  get length() { return storage.size }
} as Storage

function initStore(tableRules: Partial<TableRules> = {}) {
  const store = useCrapsStore()
  store.initializeGame({ heroName: 'Tester', bankroll: 50000, stakeLevel: 2, tableRules, bots: [] })
  return store
}

beforeEach(() => {
  setActivePinia(createPinia())
  storage.clear()
})

describe('vig', () => {
  /** Exact expected loss per unit wagered, from the 6-ways-to-7 vs ways-to-number race. */
  function buyEdge(num: number, ways: number, timing: TableRules['buyVigTiming']): number {
    const r = { ...rules, buyVigTiming: timing }
    const stake = 2000
    const cost = stake + getUpfrontVig(`buy${num}` as BetType, stake, r)
    const back = calculatePayout(bet(`buy${num}` as BetType, stake, num), r)
    const pWin = ways / (ways + 6)
    return (cost - pWin * back) / cost
  }

  it('Buy 4 matches its documented house edge in both vig modes', () => {
    expect(buyEdge(4, 3, 'on_win')).toBeCloseTo(crapsConfig.houseEdges.buy4VigOnWin, 4)
    expect(buyEdge(4, 3, 'on_bet')).toBeCloseTo(crapsConfig.houseEdges.buy4VigOnBet, 4)
  })

  it('charges the same vig on a winning Buy whichever way it is timed', () => {
    const onWin = calculatePayout(bet('buy10', 2000, 10), { ...rules, buyVigTiming: 'on_win' })
    const onBet = calculatePayout(bet('buy10', 2000, 10), { ...rules, buyVigTiming: 'on_bet' })
    expect(onBet - onWin).toBe(getUpfrontVig('buy10', 2000, { ...rules, buyVigTiming: 'on_bet' }))
  })

  it('only Buy bets on a vig-on-bet table pay up front', () => {
    const onBet = { ...rules, buyVigTiming: 'on_bet' as const }
    expect(getUpfrontVig('buy4', 2000, onBet)).toBe(100)
    expect(getUpfrontVig('buy4', 2000, rules)).toBe(0)
    expect(getUpfrontVig('lay4', 2000, onBet)).toBe(0)
    expect(getUpfrontVig('place6', 2000, onBet)).toBe(0)
  })

  it('a Lay is never a free bet: the house keeps an edge in both vig modes', () => {
    for (const timing of ['on_win', 'on_bet'] as const) {
      const back = calculatePayout(bet('lay4', 4000, 4), { ...rules, buyVigTiming: timing })
      // Lay 4 wins 6 times in 9. Fair payout would return exactly 6000.
      expect(back).toBe(4000 + 2000 - 100)
      expect((6 / 9) * back).toBeLessThan(4000)
    }
  })
})

describe('resolveOddsTarget — cumulative odds limits', () => {
  it('counts odds already behind the line against the maximum', () => {
    const bets = [bet('pass', 1000), bet('passOdds', 3000, 4)]
    // 3x on the 4 = $30 max, and $30 is already there
    const res = resolveOddsTarget('passOdds', 1000, 'hero', bets, 4, '3-4-5x')
    expect(res.ok).toBe(false)
  })

  it('allows topping up to the maximum but not past it', () => {
    const bets = [bet('pass', 1000), bet('passOdds', 2000, 4)]
    expect(resolveOddsTarget('passOdds', 1000, 'hero', bets, 4, '3-4-5x')).toEqual({ ok: true, point: 4 })
    const over = resolveOddsTarget('passOdds', 1500, 'hero', bets, 4, '3-4-5x')
    expect(over).toEqual({ ok: false, reason: 'Only $10 more Pass Odds allowed on this bet' })
  })

  it('requires the flat bet and an established point', () => {
    expect(resolveOddsTarget('passOdds', 1000, 'hero', [], 4, '3-4-5x').ok).toBe(false)
    expect(resolveOddsTarget('passOdds', 1000, 'hero', [bet('pass', 1000)], null, '3-4-5x').ok).toBe(false)
    // a come bet still waiting for its point cannot take odds
    expect(resolveOddsTarget('comeOdds', 1000, 'hero', [bet('come', 1000)], 6, '3-4-5x').ok).toBe(false)
  })

  it('ignores other players\' bets', () => {
    const bets = [bet('pass', 1000, null, { owner: 'bot-0' })]
    expect(resolveOddsTarget('passOdds', 1000, 'hero', bets, 4, '3-4-5x').ok).toBe(false)
  })

  it('lay odds are capped by what they can WIN', () => {
    expect(getMaxLayOdds(1000, 4, '3-4-5x')).toBe(6000) // lay $60 to win $30
    expect(getMaxLayOdds(1000, 6, '3-4-5x')).toBe(6000) // lay $60 to win $50
    expect(getMaxLayOdds(1000, 7, '3-4-5x')).toBe(0)
    const bets = [bet('dontPass', 1000), bet('dontPassOdds', 6000, 4)]
    expect(resolveOddsTarget('dontPassOdds', 100, 'hero', bets, 4, '3-4-5x').ok).toBe(false)
  })

  it('sends come odds to the first come point with room, then the next', () => {
    const bets = [bet('come', 1000, 6), bet('come', 1000, 8)]
    expect(resolveOddsTarget('comeOdds', 5000, 'hero', bets, 4, '3-4-5x')).toEqual({ ok: true, point: 6 })
    bets.push(bet('comeOdds', 5000, 6))
    // the 6 is full, so the next odds bet belongs to the 8
    expect(resolveOddsTarget('comeOdds', 5000, 'hero', bets, 4, '3-4-5x')).toEqual({ ok: true, point: 8 })
    bets.push(bet('comeOdds', 5000, 8))
    expect(resolveOddsTarget('comeOdds', 100, 'hero', bets, 4, '3-4-5x').ok).toBe(false)
  })

  it('honours an explicit come point and rejects one with no come bet', () => {
    const bets = [bet('come', 1000, 6), bet('come', 1000, 8)]
    expect(resolveOddsTarget('comeOdds', 1000, 'hero', bets, 4, '3-4-5x', 8)).toEqual({ ok: true, point: 8 })
    expect(resolveOddsTarget('comeOdds', 1000, 'hero', bets, 4, '3-4-5x', 9).ok).toBe(false)
    expect(resolveOddsTarget('dontComeOdds', 1000, 'hero', [bet('dontCome', 1000, 5)], 4, '3-4-5x'))
      .toEqual({ ok: true, point: 5 })
  })
})

describe('findOrphanedOdds', () => {
  it('keeps odds whose flat bet is still up', () => {
    const bets = [bet('pass', 1000), bet('passOdds', 2000, 4), bet('come', 1000, 6), bet('comeOdds', 1000, 6)]
    expect(findOrphanedOdds(bets)).toEqual([])
  })

  it('matches come odds to their own point, not just any come bet', () => {
    const odds6 = bet('comeOdds', 1000, 6)
    const odds8 = bet('comeOdds', 1000, 8)
    // the Come 6 is gone; the Come 8 is still working
    expect(findOrphanedOdds([bet('come', 1000, 8), odds6, odds8])).toEqual([odds6])
  })

  it('flags don\'t odds left behind by a taken-down flat bet', () => {
    const odds = bet('dontPassOdds', 2000, 4)
    expect(findOrphanedOdds([odds, bet('place6', 1200, 6)])).toEqual([odds])
  })

  it('does not treat another player\'s flat bet as the parent', () => {
    const odds = bet('passOdds', 2000, 4)
    expect(findOrphanedOdds([bet('pass', 1000, null, { owner: 'bot-0' }), odds])).toEqual([odds])
  })
})

describe('formatCents with losses', () => {
  it('puts the minus sign before the currency symbol', () => {
    expect(formatCents(-500)).toBe('-$5')
    expect(formatCents(-1250)).toBe('-$12.50')
    expect(formatCents(-250000)).toBe('-$2,500')
  })

  it('formatSignedCents keeps the sign of a loss', () => {
    expect(formatSignedCents(500)).toBe('+$5')
    expect(formatSignedCents(-500)).toBe('-$5')
    expect(formatSignedCents(0)).toBe('+$0')
  })
})

describe('store accounting', () => {
  it('a bet taken down without action is backed out of the wagering stats', () => {
    const store = initStore()
    const b = bet('place6', 1200, 6)
    store.addBet(b)
    store.removeBet(b.id)
    expect(store.hero!.bankroll).toBe(50000)
    expect(store.sessionStats.totalWagered).toBe(0)
    expect(store.sessionStats.betTypeStats.place6).toMatchObject({ timesPlaced: 0, totalWagered: 0 })
  })

  it('up-front vig is a cost that shows in P&L, and comes back on take-down', () => {
    const store = initStore()
    const b = bet('buy4', 2000, 4)
    store.addBet(b, 100)
    expect(store.hero!.bankroll).toBe(50000 - 2100)
    expect(store.sessionStats.totalProfitLoss).toBe(-100)
    expect(store.sessionStats.betTypeStats.buy4!.netProfitLoss).toBe(-100)
    store.removeBet(b.id, 100)
    expect(store.hero!.bankroll).toBe(50000)
    expect(store.sessionStats.totalProfitLoss).toBe(0)
  })

  it('P&L always equals the change in bankroll once bets resolve', () => {
    const store = initStore()
    const b = bet('buy4', 2000, 4)
    store.addBet(b, 100)
    store.applyResolutions([{
      betId: b.id, betType: 'buy4', owner: 'hero', outcome: 'win', payout: 6000, netGain: 4000, description: ''
    }])
    expect(store.sessionStats.totalProfitLoss).toBe(store.hero!.bankroll - store.hero!.startingBankroll)
  })

  it('a player with chips still on the felt is not busted', () => {
    const store = initStore()
    const a = bet('field', 25000)
    const b = bet('place6', 25000, 6)
    store.addBet(a)
    store.addBet(b)
    expect(store.hero!.bankroll).toBe(0)
    store.applyResolutions([{
      betId: a.id, betType: 'field', owner: 'hero', outcome: 'lose', payout: 0, netGain: -25000, description: ''
    }])
    expect(store.hero!.isBusted).toBe(false) // the place bet is still riding
    store.applyResolutions([{
      betId: b.id, betType: 'place6', owner: 'hero', outcome: 'lose', payout: 0, netGain: -25000, description: ''
    }])
    expect(store.hero!.isBusted).toBe(true)
  })

  it('a loss then a win on the same roll is not a bust', () => {
    const store = initStore()
    const a = bet('field', 25000)
    const b = bet('any7', 25000)
    store.addBet(a)
    store.addBet(b)
    store.applyResolutions([
      { betId: a.id, betType: 'field', owner: 'hero', outcome: 'lose', payout: 0, netGain: -25000, description: '' },
      { betId: b.id, betType: 'any7', owner: 'hero', outcome: 'win', payout: 125000, netGain: 100000, description: '' }
    ])
    expect(store.hero!.isBusted).toBe(false)
  })
})

describe('parseSession — saved state is untrusted', () => {
  function saved(): Record<string, unknown> {
    const store = initStore()
    store.addBet(bet('pass', 1000))
    store.setCurrentRoll({ die1: 3, die2: 3, total: 6, isHard: true })
    store.setPoint(6)
    store.setPhase('POINT_PHASE')
    store.dontBetRemovedThisCycle.add('hero-dontCome')
    store.saveToLocalStorage()
    return JSON.parse(storage.get(crapsConfig.storage.localStorageKey)!)
  }

  it('accepts what the store itself wrote', () => {
    const session = parseSession(saved())!
    expect(session).not.toBeNull()
    expect(session.point).toBe(6)
    expect(session.puckState).toBe('ON')
    expect(session.activeBets).toHaveLength(1)
    expect(session.rollHistory).toEqual([{ die1: 3, die2: 3, total: 6, isHard: true }])
    expect(session.dontBetRemovedThisCycle).toEqual(['hero-dontCome'])
  })

  it('the "can\'t re-place a removed Don\'t bet" rule survives a reload', () => {
    saved()
    setActivePinia(createPinia())
    const fresh = useCrapsStore()
    expect(fresh.loadFromLocalStorage()).toBe(true)
    expect(fresh.dontBetRemovedThisCycle.has('hero-dontCome')).toBe(true)
  })

  it('rejects non-objects and missing sections', () => {
    for (const junk of [null, 42, 'x', [], {}]) expect(parseSession(junk)).toBeNull()
    for (const key of ['tableRules', 'players', 'sessionStats']) {
      const data = saved()
      Reflect.deleteProperty(data, key)
      expect(parseSession(data)).toBeNull()
    }
  })

  it.each([
    ['a phase the table cannot resume from', (d: any) => { d.phase = 'RESOLVING' }],
    ['a point with the puck off', (d: any) => { d.phase = 'COME_OUT' }],
    ['a point that is not a point number', (d: any) => { d.point = 7 }],
    ['a shooter seat with nobody in it', (d: any) => { d.shooterSeat = 5 }],
    ['a fractional roll count', (d: any) => { d.rollNumber = 1.5 }],
    ['a negative bankroll', (d: any) => { d.players[0].bankroll = -1 }],
    ['a non-numeric bankroll', (d: any) => { d.players[0].bankroll = '1e99' }],
    ['an absurdly large bankroll', (d: any) => { d.players[0].bankroll = 1e300 }],
    ['a hero in the wrong seat', (d: any) => { d.players[0].id = 'bot-0' }],
    ['an unknown bet type', (d: any) => { d.activeBets[0].type = '__proto__' }],
    ['a bet owned by nobody at the table', (d: any) => { d.activeBets[0].owner = 'ghost' }],
    ['a zero-amount bet', (d: any) => { d.activeBets[0].amount = 0 }],
    ['duplicate bet ids', (d: any) => { d.activeBets.push({ ...d.activeBets[0] }) }],
    ['an impossible die', (d: any) => { d.rollHistory[0].die1 = 7 }],
    ['an unknown odds table', (d: any) => { d.tableRules.oddsMultiple = '1000x' }],
    ['an inherited odds-table key', (d: any) => { d.tableRules.oddsMultiple = 'constructor' }],
    ['a max bet below the minimum', (d: any) => { d.tableRules.maxBet = 1 }],
    ['an unknown rounding mode', (d: any) => { d.tableRules.payoutRounding = 'up' }],
    ['stats for a bet type that does not exist', (d: any) => { d.sessionStats.betTypeStats.bogus = {} }],
    ['non-numeric stats', (d: any) => { d.sessionStats.totalWagered = null }]
  ])('rejects %s', (_label, corrupt) => {
    const data = saved()
    corrupt(data)
    expect(parseSession(data)).toBeNull()
  })

  it('rebuilds derived and display fields instead of trusting them', () => {
    const data = saved() as any
    data.rollHistory[0].total = 12
    data.rollHistory[0].isHard = false
    data.puckState = 'OFF'
    data.players[0].name = '<img src=x onerror=alert(1)>Ann'
    data.players[0].isHero = false
    data.players[0].extra = 'dropped'
    data.selectedChipValue = -5
    data.dontBetRemovedThisCycle = ['ghost-dontPass', 'hero-pass', 7, 'hero-dontPass']
    const session = parseSession(data)!
    expect(session.rollHistory[0]).toEqual({ die1: 3, die2: 3, total: 6, isHard: true })
    expect(session.puckState).toBe('ON')
    expect(session.players[0]).toMatchObject({ name: 'Ann', isHero: true })
    expect(session.players[0]).not.toHaveProperty('extra')
    expect(session.selectedChipValue).toBe(session.tableRules.minBet)
    expect(session.dontBetRemovedThisCycle).toEqual(['hero-dontPass'])
  })

  it('a corrupt save is discarded, not half-loaded', () => {
    const data = saved() as any
    data.sessionStats = 'gone'
    storage.set(crapsConfig.storage.localStorageKey, JSON.stringify(data))
    setActivePinia(createPinia())
    const fresh = useCrapsStore()
    expect(fresh.loadFromLocalStorage()).toBe(false)
    expect(fresh.phase).toBe('SETUP')
    expect(storage.has(crapsConfig.storage.localStorageKey)).toBe(false)
  })

  it('unparseable JSON is discarded too', () => {
    storage.set(crapsConfig.storage.localStorageKey, '{not json')
    expect(useCrapsStore().loadFromLocalStorage()).toBe(false)
    expect(storage.has(crapsConfig.storage.localStorageKey)).toBe(false)
  })

  it('keeps the whole roll history, not just the last 50', () => {
    const store = initStore()
    for (let i = 0; i < 120; i++) store.setCurrentRoll({ die1: 1, die2: 2, total: 3, isHard: false })
    store.saveToLocalStorage()
    setActivePinia(createPinia())
    const fresh = useCrapsStore()
    fresh.loadFromLocalStorage()
    expect(fresh.rollHistory).toHaveLength(120)
  })
})
