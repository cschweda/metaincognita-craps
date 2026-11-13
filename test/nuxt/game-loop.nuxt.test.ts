import { describe, it, expect, beforeEach } from 'vitest'
import { useCrapsStore } from '../../app/stores/craps'
import { useGameLoop } from '../../app/composables/useGameLoop'
import { useBetManager } from '../../app/composables/useBetManager'

function freshGame() {
  const store = useCrapsStore()
  store.clearSession()
  store.initializeGame({
    heroName: 'Tester', bankroll: 100000, stakeLevel: 2,
    tableRules: {}, bots: []
  })
  return store
}

describe('executeRoll (store integration)', () => {
  beforeEach(() => {
    freshGame()
  })

  it('pass line come-out natural pays and returns to come-out', () => {
    const store = useCrapsStore()
    const { placeBet } = useBetManager()
    const { executeRoll } = useGameLoop()
    placeBet('pass', 1000, 'hero')
    expect(store.hero!.bankroll).toBe(99000)
    executeRoll(4, 3) // 7 = natural
    expect(store.hero!.bankroll).toBe(101000)
    expect(store.phase).toBe('COME_OUT')
    expect(store.point).toBeNull()
  })

  it('seven-out RETURNS an off place bet instead of losing it', () => {
    const store = useCrapsStore()
    const { placeBet, toggleBetWorking } = useBetManager()
    const { executeRoll } = useGameLoop()
    placeBet('pass', 1000, 'hero')
    executeRoll(2, 2) // point 4 established
    expect(store.point).toBe(4)
    const place = placeBet('place6', 1200, 'hero')!
    toggleBetWorking(place.id) // turn the place bet OFF
    const before = store.hero!.bankroll
    executeRoll(3, 4) // seven out: pass loses (already deducted), OFF place returned
    expect(store.hero!.bankroll).toBe(before + 1200)
    expect(store.phase).toBe('COME_OUT')
  })

  it('cannot take down a pass bet after the point is established (H1)', () => {
    const store = useCrapsStore()
    const { placeBet, removeBet } = useBetManager()
    const { executeRoll } = useGameLoop()
    const pass = placeBet('pass', 1000, 'hero')!
    executeRoll(3, 3) // point 6
    expect(removeBet(pass.id)).toBe(false)
    expect(store.activeBets.find(b => b.id === pass.id)).toBeTruthy()
  })

  it('odds cannot be stacked past the table limit one chip at a time', () => {
    const store = useCrapsStore()
    const { placeBet } = useBetManager()
    const { executeRoll } = useGameLoop()
    placeBet('pass', 1000, 'hero')
    executeRoll(2, 2) // point 4 → 3x odds = $30 max
    expect(placeBet('passOdds', 3000, 'hero')).not.toBeNull()
    expect(placeBet('passOdds', 1000, 'hero')).toBeNull()
    const odds = store.activeBets.filter(b => b.type === 'passOdds').reduce((s, b) => s + b.amount, 0)
    expect(odds).toBe(3000)
  })

  it('the table maximum caps the total on a bet, not each chip', () => {
    const store = useCrapsStore()
    const { placeBet } = useBetManager()
    const max = store.tableRules.maxBet
    store.hero!.bankroll = max * 3
    expect(placeBet('field', max, 'hero')).not.toBeNull()
    expect(placeBet('field', store.tableRules.minBet, 'hero')).toBeNull()
  })

  it('come odds ride on the right come point and survive another point resolving', () => {
    const store = useCrapsStore()
    const { placeBet } = useBetManager()
    const { executeRoll } = useGameLoop()
    placeBet('pass', 1000, 'hero')
    executeRoll(2, 2) // point 4
    placeBet('come', 1000, 'hero')
    executeRoll(3, 3) // come point 6
    placeBet('come', 1000, 'hero')
    executeRoll(4, 4) // come point 8
    expect(placeBet('comeOdds', 5000, 'hero')!.pointNumber).toBe(6)
    expect(placeBet('comeOdds', 5000, 'hero')!.pointNumber).toBe(8)
    executeRoll(1, 3) // point 4 made → come-out; come odds are OFF by default
    expect(store.phase).toBe('COME_OUT')
    placeBet('pass', 1000, 'hero')
    const before = store.hero!.bankroll
    executeRoll(5, 1) // 6: Come 6 wins $10, its OFF odds come back; pass point is 6
    expect(store.hero!.bankroll).toBe(before + 2000 + 5000)
    // the Come 8 and ITS odds are untouched
    expect(store.activeBets.filter(b => b.pointNumber === 8).map(b => b.type).sort()).toEqual(['come', 'comeOdds'])
  })

  it('taking down a Don\'t Pass brings its odds down with it', () => {
    const store = useCrapsStore()
    const { placeBet, removeBet } = useBetManager()
    const { executeRoll } = useGameLoop()
    const dp = placeBet('dontPass', 1000, 'hero')!
    executeRoll(2, 2) // point 4
    placeBet('dontPassOdds', 6000, 'hero')
    expect(removeBet(dp.id)).toBe(true)
    expect(store.activeBets).toHaveLength(0)
    expect(store.hero!.bankroll).toBe(100000)
  })

  it('no bets go up or come down while the dice are in the air', () => {
    const store = useCrapsStore()
    const { placeBet, removeBet, toggleBetWorking } = useBetManager()
    const field = placeBet('field', 1000, 'hero')!
    const hard = placeBet('hard6', 1000, 'hero')!
    store.diceInAir = true
    expect(placeBet('any7', 1000, 'hero')).toBeNull()
    expect(removeBet(field.id)).toBe(false)
    expect(toggleBetWorking(hard.id)).toBe(false)
    expect(store.activeBets).toHaveLength(2)
    store.diceInAir = false
    expect(removeBet(field.id)).toBe(true)
  })

  it('vig-on-bet Buy: vig is charged on top, refunded on take-down, kept on a win', () => {
    const store = useCrapsStore()
    store.tableRules.buyVigTiming = 'on_bet'
    const { placeBet, removeBet } = useBetManager()
    const { executeRoll } = useGameLoop()
    placeBet('pass', 1000, 'hero')
    executeRoll(3, 3) // point 6
    const start = store.hero!.bankroll
    const buy = placeBet('buy4', 2000, 'hero')!
    expect(store.hero!.bankroll).toBe(start - 2100)
    removeBet(buy.id)
    expect(store.hero!.bankroll).toBe(start)
    placeBet('buy4', 2000, 'hero')
    executeRoll(2, 2) // 4 hits: $20 back + $40 won; the $1 vig stays with the house
    expect(store.hero!.bankroll).toBe(start + 4000 - 100)
  })
})
