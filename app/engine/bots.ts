import type { ActiveBet, BetResolution, BetType, GamePhase, TableRules } from '../utils/betTypes'
import { listOddsRoom } from './betting'

/**
 * Bot co-bettors (Doc 04). Each bot plays one named, fully mechanical betting
 * system — no randomness, no judgement — so the table shows what the math
 * does to each system over time.
 *
 * Everything here is pure: given what a bot can see, return what it wants to
 * do. The caller validates and executes each action through the same bet
 * manager the hero uses, so a bot can never do anything a player could not.
 */

export interface BotSeat {
  id: string
  strategy: string | null
  bankroll: number
  /** Consecutive line-bet losses — Martingale's only memory. */
  lossStreak: number
  isShooter: boolean
}

export interface BotTable {
  phase: GamePhase
  point: number | null
  tableRules: TableRules
  /** Every live bet on the table; a bot only ever reads its own. */
  activeBets: ActiveBet[]
}

export type BotAction
  = | { do: 'place', type: BetType, amount: number, pointNumber?: number }
    | { do: 'remove', betId: string }

/** Smallest multiple of `step` that is at least the table minimum. */
function unit(minBet: number, step: number): number {
  return Math.ceil(minBet / step) * step
}

/** Place 6/8 pay 7:6 — bet in $6 steps so the payout is never rounded away. */
const sixEightUnit = (rules: TableRules) => unit(rules.minBet, 600)
/** Place 5/9 pay 7:5 — bet in $5 steps. */
const fiveNineUnit = (rules: TableRules) => unit(rules.minBet, 500)

/** What a Martingale player bets after `lossStreak` straight losses. */
export function martingaleBet(lossStreak: number, rules: TableRules): number {
  const bet = rules.minBet * 2 ** lossStreak
  return bet > rules.maxBet ? rules.minBet : bet
}

/**
 * What a bot does before the dice go out.
 * Actions are ordered; flat bets come before the odds that depend on them.
 */
export function botActionsBeforeRoll(bot: BotSeat, table: BotTable): BotAction[] {
  const { phase, point, tableRules: rules, activeBets } = table
  if (phase !== 'COME_OUT' && phase !== 'POINT_PHASE') return []

  const mine = activeBets.filter(b => b.owner === bot.id && b.status !== 'resolved')
  const comeOut = phase === 'COME_OUT'
  const min = rules.minBet
  const actions: BotAction[] = []
  let left = bot.bankroll

  const has = (type: BetType) =>
    mine.some(b => b.type === type) || actions.some(a => a.do === 'place' && a.type === type)

  /** Flat bet: all or nothing. */
  const place = (type: BetType, amount: number) => {
    if (has(type) || amount > left) return
    actions.push({ do: 'place', type, amount })
    left -= amount
  }

  /** Odds: fill every spot to the table limit, or as far as the rack allows. */
  const maxOdds = (type: 'passOdds' | 'dontPassOdds' | 'comeOdds' | 'dontComeOdds') => {
    for (const room of listOddsRoom(type, bot.id, activeBets, point, rules.oddsMultiple)) {
      const amount = Math.floor(Math.min(room.remaining, left) / 100) * 100
      if (amount < 100) continue
      actions.push({ do: 'place', type, amount, pointNumber: room.point })
      left -= amount
    }
  }

  switch (bot.strategy) {
    case 'pass_max_odds': // Conservative Carl
      if (comeOut) place('pass', min)
      else maxOdds('passOdds')
      break

    case 'dont_pass_lay': // Don't Debbie
      if (comeOut) place('dontPass', min)
      else maxOdds('dontPassOdds')
      break

    case 'three_point': { // Three-Point Molly: Pass + two Come, all with max odds
      if (comeOut) {
        place('pass', min)
        break
      }
      maxOdds('passOdds')
      maxOdds('comeOdds')
      const comeBets = mine.filter(b => b.type === 'come')
      const comePoints = new Set(comeBets.filter(b => b.pointNumber !== null).map(b => b.pointNumber))
      const travelling = comeBets.some(b => b.pointNumber === null)
      if (!travelling && comePoints.size < 2) place('come', min)
      break
    }

    case 'martingale': { // Martingale Mike: double the line bet after every loss
      if (!comeOut) break
      const bet = martingaleBet(bot.lossStreak, rules)
      // Can't cover the doubled bet: the progression is dead, start over.
      place('pass', bet <= left ? bet : min)
      break
    }

    case 'iron_cross': // Iron Cross Irene: every number but the 7
      if (!comeOut) {
        place('place5', fiveNineUnit(rules))
        place('place6', sixEightUnit(rules))
        place('place8', sixEightUnit(rules))
        place('field', min)
      }
      break

    case 'regression': { // Regression Rick: start at two units, regress after a hit
      if (comeOut) break
      const fresh = !has('place6') && !has('place8')
      const amount = sixEightUnit(rules) * (fresh ? 2 : 1)
      place('place6', amount)
      place('place8', amount)
      break
    }

    case 'press': // Press Patricia: start small, press every win
      if (!comeOut) {
        place('place6', sixEightUnit(rules))
        place('place8', sixEightUnit(rules))
      }
      break

    case 'props_only': // Prop Bet Pete: nothing but sucker bets
      place('hard4', min)
      place('hard6', min)
      place('hard8', min)
      place('hard10', min)
      place('horn', unit(min, 400))
      place('anyCraps', min)
      break
  }

  // MBS 3.7: whoever holds the dice must have a line bet on the come-out,
  // whatever their system says.
  if (bot.isShooter && comeOut && !has('pass') && !has('dontPass') && min <= left) {
    actions.unshift({ do: 'place', type: 'pass', amount: min })
  }

  return actions
}

/**
 * What a bot does once a roll has been paid — the systems that react to a
 * win. `table` is the state AFTER the roll; `resolutions` are the bot's own.
 * Place bets stay up when they win, so the bets being adjusted still exist.
 */
export function botActionsAfterRoll(bot: BotSeat, table: BotTable, resolutions: BetResolution[]): BotAction[] {
  const { tableRules: rules, activeBets } = table
  const mine = activeBets.filter(b => b.owner === bot.id && b.status !== 'resolved')
  const wins = resolutions.filter(r =>
    r.owner === bot.id && r.outcome === 'win' && (r.betType === 'place6' || r.betType === 'place8')
  )
  if (wins.length === 0) return []
  const actions: BotAction[] = []
  const riding = (type: BetType) => mine.filter(b => b.type === type)
  const total = (type: BetType) => riding(type).reduce((sum, b) => sum + b.amount, 0)

  if (bot.strategy === 'regression') {
    // First hit: profit is locked in, drop both numbers to a single unit.
    const one = sixEightUnit(rules)
    for (const type of ['place6', 'place8'] as const) {
      if (total(type) <= one) continue
      for (const bet of riding(type)) actions.push({ do: 'remove', betId: bet.id })
      actions.push({ do: 'place', type, amount: one })
    }
  }

  if (bot.strategy === 'press') {
    // Full press: double whichever number just hit, up to the table maximum.
    for (const type of new Set(wins.map(w => w.betType))) {
      const current = total(type)
      if (current > 0 && current * 2 <= rules.maxBet) {
        actions.push({ do: 'place', type, amount: current })
      }
    }
  }

  return actions
}

/** Martingale's memory: count line losses, reset on a win or at the table limit. */
export function nextLossStreak(bot: BotSeat, resolutions: BetResolution[], rules: TableRules): number {
  if (bot.strategy !== 'martingale') return 0
  const line = resolutions.find(r => r.owner === bot.id && r.betType === 'pass')
  if (!line || (line.outcome !== 'win' && line.outcome !== 'lose')) return bot.lossStreak
  if (line.outcome === 'win') return 0
  const next = bot.lossStreak + 1
  // The next doubled bet would break the table maximum: eat the loss, reset.
  return rules.minBet * 2 ** next > rules.maxBet ? 0 : next
}
