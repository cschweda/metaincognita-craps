import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCrapsStore } from '../../app/stores/craps'
import { generateBetId } from '../../app/utils/betTypes'
import type { ActiveBet } from '../../app/utils/betTypes'

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

function initStore() {
  const store = useCrapsStore()
  store.initializeGame({
    heroName: 'Tester',
    bankroll: 50000,
    stakeLevel: 2,
    tableRules: {},
    bots: []
  })
  return store
}

function makeBet(overrides: Partial<ActiveBet> = {}): ActiveBet {
  return {
    id: generateBetId(),
    type: 'pass',
    owner: 'hero',
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

beforeEach(() => {
  setActivePinia(createPinia())
  storage.clear()
})

describe('craps store', () => {
  it('addBet deducts bankroll and tracks wagered stats', () => {
    const store = initStore()
    store.addBet(makeBet({ amount: 1500 }))
    expect(store.hero!.bankroll).toBe(48500)
    expect(store.sessionStats.totalWagered).toBe(1500)
  })

  it('applyResolutions pays winners and removes resolved bets', () => {
    const store = initStore()
    const bet = makeBet({ amount: 1000 })
    store.addBet(bet)
    store.applyResolutions([{
      betId: bet.id, betType: 'pass', owner: 'hero',
      outcome: 'win', payout: 2000, netGain: 1000, description: 'test'
    }])
    expect(store.hero!.bankroll).toBe(51000)
    expect(store.activeBets).toHaveLength(0)
  })

  it('save + load round-trips core state', () => {
    const store = initStore()
    store.addBet(makeBet())
    store.setPoint(6)
    store.saveToLocalStorage()

    setActivePinia(createPinia())
    const fresh = useCrapsStore()
    expect(fresh.loadFromLocalStorage()).toBe(true)
    expect(fresh.point).toBe(6)
    expect(fresh.activeBets).toHaveLength(1)
  })
})
