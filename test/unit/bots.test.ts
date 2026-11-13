import { describe, it, expect } from 'vitest'
import type { ActiveBet, BetResolution, BetType, TableRules } from '../../app/utils/betTypes'
import type { BotAction, BotSeat, BotTable } from '../../app/engine/bots'
import { botActionsAfterRoll, botActionsBeforeRoll, martingaleBet, nextLossStreak } from '../../app/engine/bots'
import {
  canToggleWorking, fitBetAmount, getMinimumBet, getPropUnit, isCenterBet, listOddsRoom, staysUpAfterWin
} from '../../app/engine/betting'
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
function bet(type: BetType, amount: number, pointNumber: number | null = null, owner = 'bot-0'): ActiveBet {
  return {
    id: `bet-${++n}`, type, owner, amount, oddsAmount: 0, pointNumber,
    isContract: false, isWorking: true, status: 'active', placedOnRoll: 0, resolvedOnRoll: null
  }
}

function seat(strategy: string, extra: Partial<BotSeat> = {}): BotSeat {
  return { id: 'bot-0', strategy, bankroll: 50000, lossStreak: 0, isShooter: false, ...extra }
}

function table(phase: 'COME_OUT' | 'POINT_PHASE', point: number | null, activeBets: ActiveBet[] = []): BotTable {
  return { phase, point, tableRules: rules, activeBets }
}

const win = (betType: BetType, owner = 'bot-0'): BetResolution =>
  ({ betId: 'x', betType, owner, outcome: 'win', payout: 0, netGain: 0, description: '' })
const lose = (betType: BetType, owner = 'bot-0'): BetResolution =>
  ({ betId: 'x', betType, owner, outcome: 'lose', payout: 0, netGain: 0, description: '' })

/** "type amount" or "type amount @point" for every place action, in order. */
function placed(actions: BotAction[]): string[] {
  return actions.flatMap(a => a.do === 'place'
    ? [`${a.type} ${a.amount}${a.pointNumber ? ` @${a.pointNumber}` : ''}`]
    : [])
}

describe('every configured system is implemented', () => {
  it.each(crapsConfig.botStrategies)('$name ($system) bets at some point in a hand', ({ system }) => {
    const comeOut = botActionsBeforeRoll(seat(system), table('COME_OUT', null))
    const pointOn = botActionsBeforeRoll(seat(system), table('POINT_PHASE', 6, [bet('pass', 1000), bet('dontPass', 1000)]))
    expect(comeOut.length + pointOn.length).toBeGreaterThan(0)
  })

  it('every system has a label for the players panel', () => {
    for (const s of crapsConfig.botStrategies) expect(s.label).toBeTruthy()
  })
})

describe('Conservative Carl — pass + max odds', () => {
  it('bets the minimum on the come-out and nothing else', () => {
    expect(placed(botActionsBeforeRoll(seat('pass_max_odds'), table('COME_OUT', null)))).toEqual(['pass 1000'])
  })

  it('takes full odds once the point is on, and only once', () => {
    const bets = [bet('pass', 1000)]
    expect(placed(botActionsBeforeRoll(seat('pass_max_odds'), table('POINT_PHASE', 4, bets)))).toEqual(['passOdds 3000 @4'])
    bets.push(bet('passOdds', 3000, 4))
    expect(botActionsBeforeRoll(seat('pass_max_odds'), table('POINT_PHASE', 4, bets))).toEqual([])
  })

  it('takes what odds it can afford when short', () => {
    const bets = [bet('pass', 1000)]
    const actions = botActionsBeforeRoll(seat('pass_max_odds', { bankroll: 1250 }), table('POINT_PHASE', 6, bets))
    expect(placed(actions)).toEqual(['passOdds 1200 @6'])
  })

  it('does not double up on a line bet it already has', () => {
    expect(botActionsBeforeRoll(seat('pass_max_odds'), table('COME_OUT', null, [bet('pass', 1000)]))).toEqual([])
  })
})

describe('Don\'t Debbie — don\'t pass + lay odds', () => {
  it('lays enough to win the odds maximum', () => {
    expect(placed(botActionsBeforeRoll(seat('dont_pass_lay'), table('COME_OUT', null)))).toEqual(['dontPass 1000'])
    const bets = [bet('dontPass', 1000)]
    expect(placed(botActionsBeforeRoll(seat('dont_pass_lay'), table('POINT_PHASE', 4, bets)))).toEqual(['dontPassOdds 6000 @4'])
  })
})

describe('Three-Point Molly — pass + two come, max odds', () => {
  it('adds a come bet while fewer than two come points are working', () => {
    const bets = [bet('pass', 1000), bet('passOdds', 3000, 4)]
    expect(placed(botActionsBeforeRoll(seat('three_point'), table('POINT_PHASE', 4, bets)))).toEqual(['come 1000'])
  })

  it('backs each come point with odds and waits for a travelling come bet', () => {
    const bets = [bet('pass', 1000), bet('passOdds', 3000, 4), bet('come', 1000, 6), bet('come', 1000)]
    expect(placed(botActionsBeforeRoll(seat('three_point'), table('POINT_PHASE', 4, bets)))).toEqual(['comeOdds 5000 @6'])
  })

  it('stops at two come points', () => {
    const bets = [
      bet('pass', 1000), bet('passOdds', 3000, 4),
      bet('come', 1000, 6), bet('comeOdds', 5000, 6), bet('come', 1000, 8), bet('comeOdds', 5000, 8)
    ]
    expect(botActionsBeforeRoll(seat('three_point'), table('POINT_PHASE', 4, bets))).toEqual([])
  })
})

describe('Martingale Mike — double after a loss', () => {
  it('doubles with each consecutive loss', () => {
    expect([0, 1, 2, 3].map(streak => martingaleBet(streak, rules))).toEqual([1000, 2000, 4000, 8000])
    expect(placed(botActionsBeforeRoll(seat('martingale', { lossStreak: 3 }), table('COME_OUT', null)))).toEqual(['pass 8000'])
  })

  it('falls back to the minimum when it cannot cover the doubled bet', () => {
    const actions = botActionsBeforeRoll(seat('martingale', { lossStreak: 3, bankroll: 5000 }), table('COME_OUT', null))
    expect(placed(actions)).toEqual(['pass 1000'])
  })

  it('counts losses, resets on a win, and resets at the table maximum', () => {
    const mike = seat('martingale', { lossStreak: 2 })
    expect(nextLossStreak(mike, [lose('pass')], rules)).toBe(3)
    expect(nextLossStreak(mike, [win('pass')], rules)).toBe(0)
    expect(nextLossStreak(mike, [], rules)).toBe(2) // no decision this roll
    expect(nextLossStreak(mike, [lose('pass', 'bot-1')], rules)).toBe(2) // someone else's loss
    // $10 × 2^8 = $2,560 breaks the $2,000 maximum → eat the loss and start over
    expect(nextLossStreak(seat('martingale', { lossStreak: 7 }), [lose('pass')], rules)).toBe(0)
    expect(martingaleBet(8, rules)).toBe(1000)
  })

  it('other systems carry no streak', () => {
    expect(nextLossStreak(seat('pass_max_odds', { lossStreak: 4 }), [lose('pass')], rules)).toBe(0)
  })
})

describe('Iron Cross Irene — every number but the 7', () => {
  it('waits for a point, then covers 5, 6, 8 and the field', () => {
    expect(botActionsBeforeRoll(seat('iron_cross'), table('COME_OUT', null))).toEqual([])
    expect(placed(botActionsBeforeRoll(seat('iron_cross'), table('POINT_PHASE', 4))))
      .toEqual(['place5 1000', 'place6 1200', 'place8 1200', 'field 1000'])
  })

  it('only re-places what is missing (the field, every roll)', () => {
    const bets = [bet('place5', 1000, 5), bet('place6', 1200, 6), bet('place8', 1200, 8)]
    expect(placed(botActionsBeforeRoll(seat('iron_cross'), table('POINT_PHASE', 4, bets)))).toEqual(['field 1000'])
  })

  it('sizes place bets in clean-paying units on a $5 table', () => {
    const t = { ...table('POINT_PHASE', 4), tableRules: { ...rules, minBet: 500 } }
    expect(placed(botActionsBeforeRoll(seat('iron_cross'), t)))
      .toEqual(['place5 500', 'place6 600', 'place8 600', 'field 500'])
  })
})

describe('Regression Rick — two units, down to one after a hit', () => {
  it('starts each shooter at two units on the 6 and 8', () => {
    expect(placed(botActionsBeforeRoll(seat('regression'), table('POINT_PHASE', 4)))).toEqual(['place6 2400', 'place8 2400'])
  })

  it('regresses both numbers after the first hit', () => {
    const six = bet('place6', 2400, 6)
    const eight = bet('place8', 2400, 8)
    const actions = botActionsAfterRoll(seat('regression'), table('POINT_PHASE', 4, [six, eight]), [win('place6')])
    expect(actions).toEqual([
      { do: 'remove', betId: six.id }, { do: 'place', type: 'place6', amount: 1200 },
      { do: 'remove', betId: eight.id }, { do: 'place', type: 'place8', amount: 1200 }
    ])
  })

  it('leaves already-regressed bets alone', () => {
    const bets = [bet('place6', 1200, 6), bet('place8', 1200, 8)]
    expect(botActionsAfterRoll(seat('regression'), table('POINT_PHASE', 4, bets), [win('place8')])).toEqual([])
    expect(botActionsBeforeRoll(seat('regression'), table('POINT_PHASE', 4, bets))).toEqual([])
  })
})

describe('Press Patricia — press every win', () => {
  it('starts at one unit', () => {
    expect(placed(botActionsBeforeRoll(seat('press'), table('POINT_PHASE', 4)))).toEqual(['place6 1200', 'place8 1200'])
  })

  it('doubles the number that hit and leaves the other alone', () => {
    const bets = [bet('place6', 1200, 6), bet('place6', 1200, 6), bet('place8', 1200, 8)]
    const actions = botActionsAfterRoll(seat('press'), table('POINT_PHASE', 4, bets), [win('place6')])
    expect(placed(actions)).toEqual(['place6 2400'])
  })

  it('stops pressing at the table maximum', () => {
    const bets = [bet('place6', 120000, 6)]
    expect(botActionsAfterRoll(seat('press'), table('POINT_PHASE', 4, bets), [win('place6')])).toEqual([])
  })

  it('does nothing without a place win of its own', () => {
    const bets = [bet('place6', 1200, 6)]
    expect(botActionsAfterRoll(seat('press'), table('POINT_PHASE', 4, bets), [lose('place6')])).toEqual([])
    expect(botActionsAfterRoll(seat('press'), table('POINT_PHASE', 4, bets), [win('place6', 'bot-1')])).toEqual([])
  })
})

describe('Prop Bet Pete — sucker bets only', () => {
  it('keeps all four hardways, a horn and any craps up — $9 in $1 units at a $10 table', () => {
    const actions = botActionsBeforeRoll(seat('props_only'), table('POINT_PHASE', 4))
    expect(placed(actions)).toEqual(['hard4 100', 'hard6 100', 'hard8 100', 'hard10 100', 'horn 400', 'anyCraps 100'])
    expect(actions.reduce((sum, a) => sum + (a.do === 'place' ? a.amount : 0), 0)).toBe(900)
  })

  it('bets bigger units at bigger tables', () => {
    const t = { ...table('POINT_PHASE', 4), tableRules: { ...rules, minBet: 10000, maxBet: 1000000 } }
    expect(placed(botActionsBeforeRoll(seat('props_only', { bankroll: 500000 }), t)))
      .toEqual(['hard4 2500', 'hard6 2500', 'hard8 2500', 'hard10 2500', 'horn 10000', 'anyCraps 2500'])
  })

  it('skips what it can no longer afford', () => {
    const actions = botActionsBeforeRoll(seat('props_only', { bankroll: 250 }), table('POINT_PHASE', 4))
    expect(placed(actions)).toEqual(['hard4 100', 'hard6 100'])
  })
})

describe('table rules that apply to every bot', () => {
  it('the shooter must have a line bet on the come-out, whatever the system', () => {
    for (const system of ['iron_cross', 'regression', 'press', 'props_only']) {
      const actions = botActionsBeforeRoll(seat(system, { isShooter: true }), table('COME_OUT', null))
      expect(actions[0]).toEqual({ do: 'place', type: 'pass', amount: 1000 })
    }
    // Debbie's don't pass already satisfies it
    expect(placed(botActionsBeforeRoll(seat('dont_pass_lay', { isShooter: true }), table('COME_OUT', null))))
      .toEqual(['dontPass 1000'])
  })

  it('a bot reads only its own bets', () => {
    const others = [bet('pass', 1000, null, 'hero'), bet('place6', 1200, 6, 'bot-1')]
    expect(placed(botActionsBeforeRoll(seat('pass_max_odds'), table('COME_OUT', null, others)))).toEqual(['pass 1000'])
    expect(botActionsBeforeRoll(seat('pass_max_odds'), table('POINT_PHASE', 4, others))).toEqual([])
  })

  it('never plans to spend more than it has', () => {
    for (const { system } of crapsConfig.botStrategies) {
      for (const bankroll of [0, 500, 1000, 2500, 7000]) {
        for (const t of [table('COME_OUT', null), table('POINT_PHASE', 6, [bet('pass', 1000), bet('dontPass', 1000)])]) {
          const cost = botActionsBeforeRoll(seat(system, { bankroll, isShooter: true }), t)
            .reduce((sum, a) => sum + (a.do === 'place' ? a.amount : 0), 0)
          expect(cost).toBeLessThanOrEqual(bankroll)
        }
      }
    }
  })

  it('sits out while the table is not taking bets', () => {
    expect(botActionsBeforeRoll(seat('props_only'), { ...table('COME_OUT', null), phase: 'SETUP' })).toEqual([])
  })

  it('an unknown system only ever covers the shooter\'s obligation', () => {
    expect(botActionsBeforeRoll(seat('made_up'), table('COME_OUT', null))).toEqual([])
    expect(placed(botActionsBeforeRoll(seat('made_up', { isShooter: true }), table('COME_OUT', null)))).toEqual(['pass 1000'])
  })
})

describe('listOddsRoom', () => {
  it('reports each come point separately, with what is already there', () => {
    const bets = [bet('come', 1000, 6), bet('come', 1000, 9), bet('comeOdds', 2000, 6)]
    expect(listOddsRoom('comeOdds', 'bot-0', bets, 4, '3-4-5x')).toEqual([
      { point: 6, max: 5000, existing: 2000, remaining: 3000 },
      { point: 9, max: 4000, existing: 0, remaining: 4000 }
    ])
  })

  it('is empty with no flat bet, or no point for line odds', () => {
    expect(listOddsRoom('passOdds', 'bot-0', [], 4, '3-4-5x')).toEqual([])
    expect(listOddsRoom('passOdds', 'bot-0', [bet('pass', 1000)], null, '3-4-5x')).toEqual([])
  })
})

describe('which bets stay up, and which can be called off', () => {
  it('place, buy, lay, hardway and big 6/8 bets stay up after a win', () => {
    for (const type of ['place6', 'buy4', 'lay10', 'hard8', 'big6', 'big8'] as const) expect(staysUpAfterWin(type)).toBe(true)
    for (const type of ['pass', 'come', 'passOdds', 'field', 'any7', 'horn', 'hopHard'] as const) expect(staysUpAfterWin(type)).toBe(false)
  })

  it('only bets whose working flag is honoured can be toggled', () => {
    for (const type of ['place6', 'buy4', 'hard8', 'passOdds', 'comeOdds'] as const) expect(canToggleWorking(type)).toBe(true)
    for (const type of ['pass', 'come', 'lay4', 'dontPassOdds', 'dontComeOdds', 'field', 'big6'] as const) expect(canToggleWorking(type)).toBe(false)
  })
})

describe('centre-table minimums', () => {
  const at = (minBet: number): TableRules => ({ ...rules, minBet })

  it('knows which bets are worked from the centre', () => {
    for (const type of ['hard6', 'any7', 'anyCraps', 'aces', 'boxcars', 'aceDeuce', 'yo', 'crapsEleven', 'horn', 'hornHigh', 'hopEasy', 'hopHard'] as const) {
      expect(isCenterBet(type)).toBe(true)
    }
    for (const type of ['pass', 'come', 'place6', 'buy4', 'lay10', 'field', 'big6', 'passOdds'] as const) {
      expect(isCenterBet(type)).toBe(false)
    }
  })

  it('the prop unit grows with the stakes and never exceeds the table minimum', () => {
    expect([500, 1000, 2500, 10000, 50000].map(min => getPropUnit(at(min)))).toEqual([100, 100, 500, 2500, 10000])
    expect(getPropUnit(at(50))).toBe(50)
  })

  it('centre bets take the prop unit; everything else the table minimum', () => {
    expect(getMinimumBet('hard8', at(1000))).toBe(100)
    expect(getMinimumBet('any7', at(2500))).toBe(500)
    expect(getMinimumBet('place6', at(1000))).toBe(1000)
    expect(getMinimumBet('field', at(1000))).toBe(1000)
  })

  it('multi-number props need one unit per number', () => {
    expect(getMinimumBet('crapsEleven', at(1000))).toBe(200)
    expect(getMinimumBet('horn', at(1000))).toBe(400)
    expect(getMinimumBet('hornHigh', at(1000))).toBe(500)
    expect(getMinimumBet('horn', at(2500))).toBe(2000)
  })

  it('a chip is rounded up to an amount a multi-number prop can split evenly', () => {
    expect(fitBetAmount('horn', 1000)).toBe(1200)
    expect(fitBetAmount('horn', 500)).toBe(800)
    expect(fitBetAmount('horn', 10000)).toBe(10000)
    expect(fitBetAmount('hornHigh', 1000)).toBe(1000)
    expect(fitBetAmount('hornHigh', 2500)).toBe(2500)
    expect(fitBetAmount('crapsEleven', 500)).toBe(600)
    // single-number bets take the chip as it is
    expect(fitBetAmount('yo', 500)).toBe(500)
    expect(fitBetAmount('pass', 2500)).toBe(2500)
  })
})
