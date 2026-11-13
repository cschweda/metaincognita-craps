import { describe, it, expect, beforeEach } from 'vitest'
import { useCrapsStore } from '../../app/stores/craps'
import { useGameLoop } from '../../app/composables/useGameLoop'
import { useBetManager } from '../../app/composables/useBetManager'
import { listOddsRoom } from '../../app/engine/betting'
import { BET_TYPE_TO_ZONE } from '../../app/utils/betTypes'
import {
  TUTORIAL_BANKROLL, TUTORIAL_STAKE_LEVEL, TUTORIAL_STEPS, fillTutorialText
} from '../../app/utils/tutorial'

function startTutorialTable() {
  const store = useCrapsStore()
  store.clearSession()
  store.initializeGame({
    heroName: 'Learner', bankroll: TUTORIAL_BANKROLL, stakeLevel: TUTORIAL_STAKE_LEVEL, tableRules: {}, bots: []
  })
  return store
}

/** Do what a step asks, exactly as the table page would. */
function perform(index: number) {
  const store = useCrapsStore()
  const { placeBet } = useBetManager()
  const { executeRoll } = useGameLoop()
  const task = TUTORIAL_STEPS[index]!.task
  if (task.kind === 'bet') {
    expect(placeBet(task.betType, store.tableRules.minBet, 'hero'), `step ${index} bet`).not.toBeNull()
  } else if (task.kind === 'odds') {
    const room = listOddsRoom('passOdds', 'hero', store.activeBets, store.point, store.tableRules.oddsMultiple)[0]!
    expect(placeBet('passOdds', room.remaining, 'hero', room.point), `step ${index} odds`).not.toBeNull()
  } else if (task.kind === 'roll') {
    executeRoll(task.dice[0], task.dice[1])
    expect({ phase: store.phase, point: store.point }, `after step ${index}`).toEqual(task.after)
  }
}

function playThrough(stepId: string) {
  const end = TUTORIAL_STEPS.findIndex(s => s.id === stepId)
  expect(end).toBeGreaterThanOrEqual(0)
  for (let i = 0; i <= end; i++) perform(i)
}

describe('tutorial script', () => {
  it('has unique step ids and ends on a Continue step', () => {
    const ids = TUTORIAL_STEPS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(TUTORIAL_STEPS.at(-1)!.task.kind).toBe('next')
    expect(TUTORIAL_STEPS[0]!.task.kind).toBe('next')
  })

  it('every bet step points at the spot that really takes that bet', () => {
    for (const step of TUTORIAL_STEPS) {
      if (step.task.kind === 'bet') expect(BET_TYPE_TO_ZONE[step.task.betType]).toBe(step.task.zone)
    }
  })

  it('every dice pair is a legal roll', () => {
    for (const step of TUTORIAL_STEPS) {
      if (step.task.kind !== 'roll') continue
      for (const die of step.task.dice) expect([1, 2, 3, 4, 5, 6]).toContain(die)
    }
  })

  it('leaves no unfilled placeholder in any text', () => {
    const { tableRules } = startTutorialTable()
    for (const step of TUTORIAL_STEPS) {
      for (const text of [step.title, step.action, ...step.body]) {
        expect(fillTutorialText(text, tableRules)).not.toMatch(/[{}]/)
      }
    }
  })

  it('quotes amounts that match the table', () => {
    const { tableRules } = startTutorialTable()
    expect(fillTutorialText('{min} {odds} {oddsWin} {placeWin}', tableRules)).toBe('$10 $50 $60 $11')
    expect(fillTutorialText('{unknown}', tableRules)).toBe('{unknown}')
  })
})

describe('tutorial played end to end on the real engine', () => {
  beforeEach(() => {
    startTutorialTable()
  })

  it('every step can be carried out and every roll lands where the script says', () => {
    const store = useCrapsStore()
    for (let i = 0; i < TUTORIAL_STEPS.length; i++) perform(i)
    // The seven-out cleared the table; the lesson ends $61 ahead.
    expect(store.activeBets).toHaveLength(0)
    expect(store.hero!.bankroll).toBe(TUTORIAL_BANKROLL + 6100)
    expect(store.sessionStats.totalProfitLoss).toBe(6100)
  })

  it('"Seven — a winner": the natural pays even money and returns the bet', () => {
    const store = useCrapsStore()
    playThrough('roll-natural')
    expect(store.hero!.bankroll).toBe(TUTORIAL_BANKROLL + 1000)
    expect(store.activeBets).toHaveLength(0)
  })

  it('"Two — craps": the line loses and the hero keeps the dice', () => {
    const store = useCrapsStore()
    playThrough('roll-craps')
    expect(store.hero!.bankroll).toBe(TUTORIAL_BANKROLL)
    expect(store.shooterSeat).toBe(0)
  })

  it('"Odds": the button amount is 5x on a 6', () => {
    const store = useCrapsStore()
    playThrough('odds')
    expect(store.heroBets.find(b => b.type === 'passOdds')).toMatchObject({ amount: 5000, pointNumber: 6 })
  })

  it('"Five — nothing happens": no bet is touched', () => {
    const store = useCrapsStore()
    playThrough('roll-nothing')
    expect(store.lastResolutions).toHaveLength(0)
    expect(store.heroBets.map(b => b.type)).toEqual(['pass', 'passOdds'])
  })

  it('"Nine — your Come bet travelled"', () => {
    const store = useCrapsStore()
    playThrough('roll-come')
    expect(store.heroBets.find(b => b.type === 'come')!.pointNumber).toBe(9)
  })

  it('"Eight — the Place bet pays" $11 and stays up', () => {
    const store = useCrapsStore()
    playThrough('place')
    const before = store.hero!.bankroll
    perform(TUTORIAL_STEPS.findIndex(s => s.id === 'roll-place'))
    expect(store.hero!.bankroll).toBe(before + 1100)
    expect(store.heroBets.some(b => b.type === 'place8')).toBe(true)
  })

  it('"Three — the Field wins" even money and comes down; nothing else moves', () => {
    const store = useCrapsStore()
    playThrough('roll-field')
    expect(store.lastResolutions.map(r => `${r.betType}:${r.outcome}:${r.netGain}`)).toEqual(['field:win:1000'])
    expect(store.heroBets.some(b => b.type === 'field')).toBe(false)
  })

  it('"Six — you made the point": line + odds paid; Come 9 and Place 8 stay, place is OFF', () => {
    const store = useCrapsStore()
    playThrough('roll-made')
    const paid = Object.fromEntries(store.lastResolutions.map(r => [r.betType, r.netGain]))
    expect(paid).toEqual({ pass: 1000, passOdds: 6000 })
    expect(store.puckState).toBe('OFF')
    expect(store.heroBets.map(b => `${b.type}@${b.pointNumber}:${b.isWorking ? 'on' : 'off'}`).sort())
      .toEqual(['come@9:on', 'place8@8:off'])
  })

  it('"Seven out": pass, come and place all lose together', () => {
    const store = useCrapsStore()
    playThrough('roll-seven-out')
    expect(store.lastResolutions.map(r => `${r.betType}:${r.outcome}`).sort())
      .toEqual(['come:lose', 'pass:lose', 'place8:lose'])
  })

  it('a reload resumes the lesson at the same step, and drops an out-of-range one', () => {
    const store = useCrapsStore()
    playThrough('roll-point')
    store.tutorialStep = TUTORIAL_STEPS.findIndex(s => s.id === 'point')
    store.saveToLocalStorage()
    const saved = localStorage.getItem('craps-simulator-session')!

    store.$reset()
    expect(store.loadFromLocalStorage()).toBe(true)
    expect(TUTORIAL_STEPS[store.tutorialStep!]!.id).toBe('point')
    expect(store.point).toBe(6)

    localStorage.setItem('craps-simulator-session', JSON.stringify({ ...JSON.parse(saved), tutorialStep: 999 }))
    store.$reset()
    expect(store.loadFromLocalStorage()).toBe(true)
    expect(store.tutorialStep).toBeNull()
  })
})
