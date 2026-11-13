import { describe, it, expect, beforeEach } from 'vitest'
import { useCrapsStore } from '../../app/stores/craps'
import { useGameLoop } from '../../app/composables/useGameLoop'
import { useBetManager } from '../../app/composables/useBetManager'
import { useBots } from '../../app/composables/useBots'
import { createSeededRng, rollDice } from '../../app/engine/rng'
import { crapsConfig } from '../../craps.config'

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

  it('vig-on-bet Buy: vig is charged on top, refunded on take-down, owed again after a win', () => {
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
    executeRoll(2, 2) // 4 hits: $40 won; the bet stays up and pays its $1 vig again
    expect(store.hero!.bankroll).toBe(start - 2100 + 4000 - 100)
    expect(store.activeBets.filter(b => b.type === 'buy4')).toHaveLength(1)
  })

  it('a winning place bet is paid and stays up', () => {
    const store = useCrapsStore()
    const { placeBet } = useBetManager()
    const { executeRoll } = useGameLoop()
    placeBet('pass', 1000, 'hero')
    executeRoll(2, 2) // point 4
    placeBet('place6', 1200, 'hero')
    const before = store.hero!.bankroll
    executeRoll(5, 1) // 6 hits: $14 paid, $12 stays working
    expect(store.hero!.bankroll).toBe(before + 1400)
    expect(store.activeBets.filter(b => b.type === 'place6')).toHaveLength(1)
    executeRoll(3, 3) // hits again
    expect(store.hero!.bankroll).toBe(before + 2800)
    expect(store.sessionStats.betTypeStats.place6).toMatchObject({ won: 2, timesPlaced: 3, totalWagered: 3600 })
    executeRoll(3, 4) // seven-out takes it
    expect(store.activeBets).toHaveLength(0)
    expect(store.hero!.bankroll).toBe(before + 2800)
  })

  it('a bet called OFF has no action; only toggleable bets can be called off', () => {
    const store = useCrapsStore()
    const { placeBet, toggleBetWorking } = useBetManager()
    const { executeRoll } = useGameLoop()
    const pass = placeBet('pass', 1000, 'hero')!
    executeRoll(2, 2) // point 4
    const place = placeBet('place6', 1200, 'hero')!
    const lay = placeBet('lay10', 2000, 'hero')!
    expect(toggleBetWorking(pass.id)).toBe(false)
    expect(toggleBetWorking(lay.id)).toBe(false)
    expect(toggleBetWorking(place.id)).toBe(true)
    const before = store.hero!.bankroll
    executeRoll(5, 1) // 6 rolls, but the place bet is off
    expect(store.hero!.bankroll).toBe(before)
    toggleBetWorking(place.id)
    executeRoll(5, 1)
    expect(store.hero!.bankroll).toBe(before + 1400)
  })
})

describe('bots at the table', () => {
  const systems = crapsConfig.botStrategies.map(s => ({ name: s.name, strategy: s.system }))

  function seatBots(bots = systems.slice(0, 7)) {
    const store = useCrapsStore()
    store.clearSession()
    store.initializeGame({ heroName: 'Tester', bankroll: 100000, stakeLevel: 2, tableRules: {}, bots })
    return store
  }

  /** One full roll the way the table page runs it. */
  function playRoll(d1: number, d2: number) {
    const store = useCrapsStore()
    const { executeRoll } = useGameLoop()
    const { betBeforeRoll, reactToRoll } = useBots()
    betBeforeRoll()
    store.diceInAir = true
    const { resolutions } = executeRoll(d1, d2)
    store.diceInAir = false
    reactToRoll(resolutions)
  }

  /** Chips in every rack plus chips on the felt. */
  function moneyOf(id: string) {
    const store = useCrapsStore()
    const player = store.players.find(p => p.id === id)!
    return player.bankroll + store.activeBets.filter(b => b.owner === id).reduce((s, b) => s + b.amount, 0)
  }

  it('bots bet their systems and it never touches the hero\'s stats or chips', () => {
    const store = seatBots()
    const { placeBet } = useBetManager()
    placeBet('pass', 1000, 'hero')
    playRoll(2, 2) // point 4
    playRoll(3, 2) // 5: bots are now fully set up
    const owners = new Set(store.activeBets.map(b => b.owner))
    expect(owners.size).toBeGreaterThan(4)
    expect(store.sessionStats.totalWagered).toBe(1000)
    expect(Object.keys(store.sessionStats.betTypeStats)).toEqual(['pass'])
    expect(store.heroBets.every(b => b.owner === 'hero')).toBe(true)
    expect(store.hero!.bankroll).toBe(99000)
  })

  it('Carl takes max odds and is paid true odds when the point is made', () => {
    const store = seatBots([systems[0]!])
    useBetManager().placeBet('pass', 1000, 'hero')
    playRoll(2, 2) // point 4
    playRoll(3, 2) // Carl puts $30 odds behind his $10 line bet
    expect(store.activeBets.filter(b => b.owner === 'bot-0').map(b => `${b.type} ${b.amount}`)).toEqual(['pass 1000', 'passOdds 3000'])
    playRoll(3, 1) // 4: line pays $10, odds pay $60
    expect(store.players[1]!.bankroll).toBe(100000 + 1000 + 6000)
  })

  it('Patricia presses a winner; Rick regresses after his first hit', () => {
    const press = systems.find(s => s.strategy === 'press')!
    const regress = systems.find(s => s.strategy === 'regression')!
    const store = seatBots([press, regress])
    useBetManager().placeBet('pass', 1000, 'hero')
    playRoll(2, 2) // point 4
    playRoll(3, 2) // both get their 6 and 8 up
    const total = (owner: string, type: string) =>
      store.activeBets.filter(b => b.owner === owner && b.type === type).reduce((s, b) => s + b.amount, 0)
    expect([total('bot-0', 'place6'), total('bot-1', 'place6')]).toEqual([1200, 2400])
    playRoll(5, 1) // 6 hits
    expect(total('bot-0', 'place6')).toBe(2400) // pressed
    expect(total('bot-0', 'place8')).toBe(1200)
    expect(total('bot-1', 'place6')).toBe(1200) // regressed
    expect(total('bot-1', 'place8')).toBe(1200)
  })

  it('Mike doubles after a loss and resets after a win', () => {
    const store = seatBots([systems.find(s => s.strategy === 'martingale')!])
    const mikeLine = () => store.activeBets.find(b => b.owner === 'bot-0' && b.type === 'pass')?.amount
    const { placeBet } = useBetManager()
    const { betBeforeRoll } = useBots()
    for (const expected of [1000, 2000, 4000]) {
      placeBet('pass', 1000, 'hero')
      betBeforeRoll()
      expect(mikeLine()).toBe(expected)
      playRoll(1, 1) // craps: the line loses
    }
    placeBet('pass', 1000, 'hero')
    playRoll(4, 3) // natural: Mike wins his $80 bet
    placeBet('pass', 1000, 'hero')
    betBeforeRoll()
    expect(mikeLine()).toBe(1000)
  })

  it('a bot shooter covers the line bet, so the hero need not bet at all', () => {
    const store = seatBots([systems.find(s => s.strategy === 'props_only')!])
    store.shooterSeat = 1
    playRoll(4, 3)
    expect(store.lastResolutions.some(r => r.owner === 'bot-0' && r.betType === 'pass' && r.outcome === 'win')).toBe(true)
  })

  it('the dice skip a busted bot', () => {
    const store = seatBots(systems.slice(0, 2))
    store.players[1]!.bankroll = 0
    store.advanceShooter()
    expect(store.players[1]!.isBusted).toBe(true)
    expect(store.shooterSeat).toBe(2)
    store.advanceShooter()
    expect(store.shooterSeat).toBe(0)
  })

  it('500 seeded rolls: no money appears or vanishes, nobody goes negative, stats stay the hero\'s', () => {
    const store = seatBots(systems)
    const { placeBet } = useBetManager()
    const rng = createSeededRng(20261113)
    const startTotal = store.players.reduce((s, p) => s + p.bankroll, 0)
    let houseTake = 0
    for (let i = 0; i < 500; i++) {
      if (store.phase === 'COME_OUT' && !store.heroBets.some(b => b.type === 'pass')) placeBet('pass', 1000, 'hero')
      const { die1, die2 } = rollDice(rng)
      const before = store.players.map(p => moneyOf(p.id))
      playRoll(die1, die2)
      store.players.forEach((p, seat) => {
        houseTake += before[seat]! - moneyOf(p.id)
        expect(p.bankroll).toBeGreaterThanOrEqual(0)
      })
    }
    // Conservation: whatever left the players is exactly what the house took.
    const endTotal = store.players.reduce((s, p) => s + moneyOf(p.id), 0)
    expect(startTotal - endTotal).toBe(houseTake)
    // Every bot actually played.
    for (const bot of store.bots) expect(bot.bankrollHistory.length).toBeGreaterThan(1)
    // Hero stats describe only the hero.
    const heroOnFelt = store.heroBets.reduce((s, b) => s + b.amount, 0)
    expect(store.sessionStats.totalProfitLoss).toBe(store.hero!.bankroll + heroOnFelt - store.hero!.startingBankroll)
    expect(Object.keys(store.sessionStats.betTypeStats)).toEqual(['pass'])
    expect(store.activeBets.every(b => store.players.some(p => p.id === b.owner))).toBe(true)
  })
})
