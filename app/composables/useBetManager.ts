import type { BetType, ActiveBet, GamePhase, TableRules } from '~/utils/betTypes'
import {
  generateBetId,
  betTypeToNumber,
  isBuyBet,
  isLayBet,
  isPlaceBet,
  isHardwayBet,
  isOddsBet,
  CONTRACT_BETS
} from '~/utils/betTypes'
import { formatCents } from '~/utils/format'
import { getUpfrontVig } from '~/engine/payouts'
import { canRemoveBet, canToggleWorking, findOrphanedOdds, getDefaultWorking, isOddsType, resolveOddsTarget } from '~/engine/betting'

interface ValidationResult {
  valid: boolean
  reason: string
}

interface GameState {
  phase: GamePhase
  point: number | null
  activeBets: ActiveBet[]
  tableRules: TableRules
  rollNumber: number
  dontBetRemovedThisCycle: Set<string>
}

export function useBetManager() {
  const store = useCrapsStore()

  /**
   * Validate whether a bet can be placed.
   */
  function validateBet(
    type: BetType,
    amount: number,
    owner: string,
    gameState: GameState,
    targetPoint?: number | null
  ): ValidationResult {
    const { phase, point, activeBets, tableRules, dontBetRemovedThisCycle } = gameState
    const player = store.players.find(p => p.id === owner)

    if (!player) {
      return { valid: false, reason: 'Player not found' }
    }

    // Phase checks
    if (phase !== 'COME_OUT' && phase !== 'POINT_PHASE' && phase !== 'BETWEEN_ROLLS') {
      return { valid: false, reason: 'Bets cannot be placed during this phase' }
    }

    // Pass/Don't Pass only on come-out
    if (type === 'pass' || type === 'dontPass') {
      if (phase !== 'COME_OUT') {
        return { valid: false, reason: `${type === 'pass' ? 'Pass' : 'Don\'t Pass'} bets can only be placed on the come-out roll` }
      }
    }

    // Come/Don't Come only during point phase
    if (type === 'come' || type === 'dontCome') {
      if (phase !== 'POINT_PHASE') {
        return { valid: false, reason: `${type === 'come' ? 'Come' : 'Don\'t Come'} bets can only be placed during the point phase` }
      }
    }

    // Place/Buy bets may go up on the come-out; they are simply OFF by default.
    // Lay bets can be placed anytime
    // One-roll bets can be placed anytime

    // Odds bets ride behind a flat bet and are capped cumulatively
    if (isOddsType(type)) {
      const target = resolveOddsTarget(type, amount, owner, activeBets, point, tableRules.oddsMultiple, targetPoint)
      if (!target.ok) {
        return { valid: false, reason: target.reason }
      }
    }

    // Don't bet removal constraint (MBS 3.16.1)
    // Once a Don't bet is removed, cannot re-place same type this cycle
    if (type === 'dontPass' && dontBetRemovedThisCycle.has(`${owner}-dontPass`)) {
      return { valid: false, reason: 'Cannot re-place Don\'t Pass after removing it this cycle (MBS 3.16.1)' }
    }
    if (type === 'dontCome' && dontBetRemovedThisCycle.has(`${owner}-dontCome`)) {
      return { valid: false, reason: 'Cannot re-place Don\'t Come after removing it this cycle (MBS 3.16.1)' }
    }

    // Min/max sizing (skip for odds bets - they have their own limits)
    if (!isOddsBet(type)) {
      if (amount < tableRules.minBet) {
        return { valid: false, reason: `Minimum bet is ${formatCents(tableRules.minBet)}` }
      }
      // The table maximum caps the total riding on a bet, not each chip:
      // stacking several max-size chips on one spot is the same bet.
      const alreadyOn = activeBets
        .filter(b => b.owner === owner && b.type === type && b.status !== 'resolved')
        .reduce((sum, b) => sum + b.amount, 0)
      if (alreadyOn + amount > tableRules.maxBet) {
        return {
          valid: false,
          reason: alreadyOn > 0
            ? `Table maximum is ${formatCents(tableRules.maxBet)} — you already have ${formatCents(alreadyOn)} on this bet`
            : `Maximum bet is ${formatCents(tableRules.maxBet)}`
        }
      }
    }

    // Multi-unit prop bets must be placed in whole-dollar unit multiples
    if (type === 'horn' && amount % 400 !== 0) {
      return { valid: false, reason: 'Horn is a 4-unit bet — use a multiple of $4' }
    }
    if (type === 'hornHigh' && amount % 500 !== 0) {
      return { valid: false, reason: 'Horn High is a 5-unit bet — use a multiple of $5' }
    }
    if (type === 'crapsEleven' && amount % 200 !== 0) {
      return { valid: false, reason: 'C&E is a 2-unit bet — use a multiple of $2' }
    }

    // Bankroll check
    const totalCost = amount + getUpfrontVig(type, amount, tableRules)
    if (player.bankroll < totalCost) {
      return { valid: false, reason: 'Insufficient bankroll' }
    }

    // Duplicate check: only one pass/dontPass per player
    if (type === 'pass' || type === 'dontPass') {
      const existing = activeBets.find(
        b => b.owner === owner && b.type === type && b.status !== 'resolved'
      )
      if (existing) {
        return { valid: false, reason: `Already have a ${type} bet` }
      }
    }

    return { valid: true, reason: '' }
  }

  /**
   * Place a bet, creating the ActiveBet and deducting from bankroll via store.
   */
  function placeBet(
    type: BetType,
    amount: number,
    owner: string,
    pointNumber?: number | null
  ): ActiveBet | null {
    const gameState: GameState = {
      phase: store.phase,
      point: store.point,
      activeBets: store.activeBets,
      tableRules: store.tableRules,
      rollNumber: store.rollNumber,
      dontBetRemovedThisCycle: store.dontBetRemovedThisCycle
    }

    // No more bets once the dice are out — the roll is already decided.
    if (store.diceInAir) return null

    const validation = validateBet(type, amount, owner, gameState, pointNumber)
    if (!validation.valid) {
      console.warn(`Bet validation failed: ${validation.reason}`)
      return null
    }

    // Determine pointNumber for the bet
    let betPoint: number | null = pointNumber ?? null
    if (isOddsType(type)) {
      // Same decision validateBet just made: which point these odds ride on.
      const target = resolveOddsTarget(
        type, amount, owner, store.activeBets, store.point, store.tableRules.oddsMultiple, pointNumber
      )
      if (!target.ok) return null
      betPoint = target.point
    }
    // Place/Buy/Lay bets: extract number from type
    if ((isPlaceBet(type) || isBuyBet(type) || isLayBet(type)) && betPoint === null) {
      betPoint = betTypeToNumber(type)
    }
    // Hardways: extract number from type
    if (isHardwayBet(type) && betPoint === null) {
      betPoint = betTypeToNumber(type)
    }
    // Horn High: the "high" number rides on pointNumber. This sim plays the
    // most common call — horn high yo (11) — unless a number is passed in.
    if (type === 'hornHigh' && betPoint === null) {
      betPoint = 11
    }

    // Hop bets are meaningless without a target total
    if ((type === 'hopEasy' || type === 'hopHard') && betPoint === null) {
      console.warn('Hop bets require a target total')
      return null
    }
    if (type === 'hopHard' && betPoint !== null && ![4, 6, 8, 10].includes(betPoint)) {
      console.warn('Hop hard target must be 4, 6, 8, or 10')
      return null
    }
    if (type === 'hopEasy' && betPoint !== null && ![3, 4, 10, 11].includes(betPoint)) {
      console.warn('Hop easy target must be 3, 4, 10, or 11')
      return null
    }

    const isContract = CONTRACT_BETS.includes(type)
    const isWorking = getDefaultWorking(type, store.phase, store.tableRules)

    const bet: ActiveBet = {
      id: generateBetId(),
      type,
      owner,
      amount,
      oddsAmount: 0,
      pointNumber: betPoint,
      isContract,
      isWorking,
      status: 'active',
      placedOnRoll: store.rollNumber,
      resolvedOnRoll: null
    }

    // Buy bets on a vig-on-bet table pay their 5% on top of the wager
    store.addBet(bet, getUpfrontVig(type, amount, store.tableRules))
    return bet
  }

  /**
   * Remove a bet if allowed. Contract bets (pass/come once point established) cannot be removed.
   * Refunds vig for buy bets if vig was on_bet.
   */
  function removeBet(betId: string): boolean {
    if (store.diceInAir) return false
    const bet = store.activeBets.find(b => b.id === betId)
    if (!bet) return false

    const removal = canRemoveBet(bet, store.point)
    if (!removal.allowed) {
      console.warn(removal.reason)
      return false
    }

    // Vig paid up front comes back with a bet taken down before it resolves
    store.removeBet(betId, getUpfrontVig(bet.type, bet.amount, store.tableRules))

    // Odds cannot stand alone: taking down a Don't Pass / Don't Come bet
    // brings its odds down with it.
    for (const orphan of findOrphanedOdds(store.activeBets)) {
      store.removeBet(orphan.id)
    }
    return true
  }

  /**
   * Toggle the isWorking flag on a bet.
   */
  function toggleBetWorking(betId: string): boolean {
    if (store.diceInAir) return false
    const bet = store.activeBets.find(b => b.id === betId)
    if (!bet) return false

    // Only bets whose working flag the resolver honours can be called off;
    // lay bets, don't-side odds, line bets and one-roll bets always work.
    if (!canToggleWorking(bet.type)) return false

    bet.isWorking = !bet.isWorking
    return true
  }

  return {
    validateBet,
    placeBet,
    removeBet,
    toggleBetWorking
  }
}
