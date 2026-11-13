import type { BetResolution } from '~/utils/betTypes'
import type { BotAction, BotSeat, BotTable } from '~/engine/bots'
import { botActionsAfterRoll, botActionsBeforeRoll, nextLossStreak } from '~/engine/bots'

/**
 * Drives the bot co-bettors. The strategies themselves are pure functions in
 * engine/bots.ts; this runs their decisions through the same bet manager the
 * hero uses, so every bot bet passes the same validation.
 */
export function useBots() {
  const store = useCrapsStore()
  const { validateBet, placeBet, removeBet } = useBetManager()

  function tableView(): BotTable {
    return {
      phase: store.phase,
      point: store.point,
      tableRules: store.tableRules,
      activeBets: store.activeBets
    }
  }

  function seats(): BotSeat[] {
    return store.players
      .map((player, seat) => ({ player, seat }))
      .filter(({ player }) => !player.isHero && !player.isBusted)
      .map(({ player, seat }) => ({
        id: player.id,
        strategy: player.strategy,
        bankroll: player.bankroll,
        lossStreak: player.lossStreak,
        isShooter: seat === store.shooterSeat
      }))
  }

  function perform(botId: string, actions: BotAction[]) {
    for (const action of actions) {
      if (action.do === 'remove') {
        removeBet(action.betId)
        continue
      }
      // Ask first: a bet a bot cannot make is skipped quietly, not logged.
      const check = validateBet(action.type, action.amount, botId, {
        phase: store.phase,
        point: store.point,
        activeBets: store.activeBets,
        tableRules: store.tableRules,
        rollNumber: store.rollNumber,
        dontBetRemovedThisCycle: store.dontBetRemovedThisCycle
      }, action.pointNumber)
      if (check.valid) placeBet(action.type, action.amount, botId, action.pointNumber)
    }
  }

  /** Bots get their bets down before the dice go out. */
  function betBeforeRoll() {
    for (const bot of seats()) {
      perform(bot.id, botActionsBeforeRoll(bot, tableView()))
    }
  }

  /** Bots react to the roll that was just paid (press, regress, count losses). */
  function reactToRoll(resolutions: BetResolution[]) {
    for (const bot of seats()) {
      const player = store.players.find(p => p.id === bot.id)!
      player.lossStreak = nextLossStreak(bot, resolutions, store.tableRules)
      perform(bot.id, botActionsAfterRoll(bot, tableView(), resolutions))
    }
  }

  return { betBeforeRoll, reactToRoll }
}
