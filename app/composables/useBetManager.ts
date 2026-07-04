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
import { crapsConfig } from '~~/craps.config'
import { calculateVig, getMaxOdds } from '~/engine/payouts'
import { canRemoveBet, getDefaultWorking } from '~/engine/betting'

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
    gameState: GameState
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

    // Place/Buy bets need a point established (point phase)
    if ((isPlaceBet(type) || isBuyBet(type)) && phase === 'COME_OUT') {
      // Some casinos allow place bets on come-out (they're just OFF by default).
      // We allow placement but they'll be off unless toggled working.
    }

    // Lay bets can be placed anytime
    // One-roll bets can be placed anytime

    // Odds bets require a parent flat bet
    if (type === 'passOdds') {
      const parentPass = activeBets.find(
        b => b.owner === owner && b.type === 'pass' && b.status !== 'resolved'
      )
      if (!parentPass) {
        return { valid: false, reason: 'Must have a Pass Line bet to place Pass Odds' }
      }
      if (!point) {
        return { valid: false, reason: 'Pass Odds can only be placed after a point is established' }
      }
      const maxOdds = getMaxOdds(parentPass.amount, point, tableRules.oddsMultiple)
      if (amount > maxOdds) {
        return { valid: false, reason: `Maximum odds for this point is ${maxOdds} cents` }
      }
    }

    if (type === 'dontPassOdds') {
      const parentDontPass = activeBets.find(
        b => b.owner === owner && b.type === 'dontPass' && b.status !== 'resolved'
      )
      if (!parentDontPass) {
        return { valid: false, reason: 'Must have a Don\'t Pass bet to place Don\'t Pass Odds' }
      }
      if (!point) {
        return { valid: false, reason: 'Don\'t Pass Odds can only be placed after a point is established' }
      }
      // Lay odds max: sized so the PAYOUT doesn't exceed the pass odds max
      // (i.e., you can lay enough to WIN the same as a pass odds bettor)
      const maxPassOdds = getMaxOdds(parentDontPass.amount, point, tableRules.oddsMultiple)
      const dontOddsRatio = crapsConfig.payouts.dontOdds[point]
      // Max lay = maxPassOdds / (payout ratio) so winnings ≤ maxPassOdds
      // e.g., point 4: pass max = 3x flat. Lay ratio is 1:2. Max lay = 3x flat / (1/2) = 6x flat
      const maxLay = dontOddsRatio
        ? Math.floor(maxPassOdds * dontOddsRatio[1] / dontOddsRatio[0])
        : maxPassOdds
      if (amount > maxLay) {
        return { valid: false, reason: `Maximum Don't Pass Odds for this point is ${maxLay} cents` }
      }
    }

    if (type === 'comeOdds') {
      // Must have an established come bet (with pointNumber set)
      const parentCome = activeBets.find(
        b => b.owner === owner && b.type === 'come' && b.pointNumber !== null && b.status !== 'resolved'
      )
      if (!parentCome) {
        return { valid: false, reason: 'Must have an established Come bet to place Come Odds' }
      }
      const maxOdds = getMaxOdds(parentCome.amount, parentCome.pointNumber!, tableRules.oddsMultiple)
      if (amount > maxOdds) {
        return { valid: false, reason: `Maximum odds for this Come point is ${maxOdds} cents` }
      }
    }

    if (type === 'dontComeOdds') {
      const parentDontCome = activeBets.find(
        b => b.owner === owner && b.type === 'dontCome' && b.pointNumber !== null && b.status !== 'resolved'
      )
      if (!parentDontCome) {
        return { valid: false, reason: 'Must have an established Don\'t Come bet to place Don\'t Come Odds' }
      }
      // Lay odds max: sized so the PAYOUT doesn't exceed the come odds max
      const maxComeOdds = getMaxOdds(parentDontCome.amount, parentDontCome.pointNumber!, tableRules.oddsMultiple)
      const dontOddsRatio = crapsConfig.payouts.dontOdds[parentDontCome.pointNumber!]
      const maxLay = dontOddsRatio
        ? Math.floor(maxComeOdds * dontOddsRatio[1] / dontOddsRatio[0])
        : maxComeOdds
      if (amount > maxLay) {
        return { valid: false, reason: `Maximum Don't Come Odds for this point is ${maxLay} cents` }
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
        return { valid: false, reason: `Minimum bet is ${tableRules.minBet} cents` }
      }
      if (amount > tableRules.maxBet) {
        return { valid: false, reason: `Maximum bet is ${tableRules.maxBet} cents` }
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
    let totalCost = amount
    if (isBuyBet(type) && tableRules.buyVigTiming === 'on_bet') {
      totalCost += calculateVig(amount)
    }
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

    const validation = validateBet(type, amount, owner, gameState)
    if (!validation.valid) {
      console.warn(`Bet validation failed: ${validation.reason}`)
      return null
    }

    // Determine pointNumber for the bet
    let betPoint: number | null = pointNumber ?? null
    if (type === 'passOdds' || type === 'dontPassOdds') {
      betPoint = store.point
    }
    if (type === 'comeOdds' || type === 'dontComeOdds') {
      const parentType = type === 'comeOdds' ? 'come' : 'dontCome'
      const parent = store.activeBets.find(
        b => b.owner === owner && b.type === parentType && b.pointNumber !== null && b.status !== 'resolved'
      )
      if (parent) {
        betPoint = parent.pointNumber
      }
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

    // For buy bets with vig on bet, deduct vig from bankroll separately
    if (isBuyBet(type) && store.tableRules.buyVigTiming === 'on_bet') {
      const vig = calculateVig(amount)
      const player = store.players.find(p => p.id === owner)
      if (player) {
        player.bankroll -= vig
      }
    }

    store.addBet(bet)
    return bet
  }

  /**
   * Remove a bet if allowed. Contract bets (pass/come once point established) cannot be removed.
   * Refunds vig for buy bets if vig was on_bet.
   */
  function removeBet(betId: string): boolean {
    const bet = store.activeBets.find(b => b.id === betId)
    if (!bet) return false

    const removal = canRemoveBet(bet, store.point)
    if (!removal.allowed) {
      console.warn(removal.reason)
      return false
    }

    // Calculate vig refund for buy bets taken down before resolution
    let vigRefund = 0
    if (isBuyBet(bet.type) && store.tableRules.buyVigTiming === 'on_bet') {
      vigRefund = calculateVig(bet.amount)
    }

    store.removeBet(betId, vigRefund)
    return true
  }

  /**
   * Toggle the isWorking flag on a bet.
   */
  function toggleBetWorking(betId: string): boolean {
    const bet = store.activeBets.find(b => b.id === betId)
    if (!bet) return false

    // Lay bets and Don't odds are always working - cannot toggle off
    if (isLayBet(bet.type) || bet.type === 'dontComeOdds' || bet.type === 'dontPassOdds') {
      console.warn('This bet is always working and cannot be toggled off')
      return false
    }

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
