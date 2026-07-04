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
})
