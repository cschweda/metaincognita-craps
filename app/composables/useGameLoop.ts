import type { DiceRoll, BetResolution, GamePhase } from '~/utils/betTypes'
import { isPlaceBet, isBuyBet, isHardwayBet } from '~/utils/betTypes'
import {
  resolveRoll,
  isBetWorking,
  transition,
  getStickmanCall
} from '~/engine/resolution'
import { getDefaultWorking } from '~/engine/betting'
import { calculateVig } from '~/engine/payouts'
import { rollDice } from '~/engine/rng'

export function useGameLoop() {
  const store = useCrapsStore()

  /**
   * Handle point_established resolutions by updating bet state.
   * Come bets get their point set; the main point is handled by transition.
   */
  function applyPointEstablished(resolutions: BetResolution[], roll: DiceRoll) {
    for (const res of resolutions) {
      if (res.outcome !== 'point_established') continue

      const bet = store.activeBets.find(b => b.id === res.betId)
      if (!bet) continue

      // Come/Don't Come bets establish their own point
      if (bet.type === 'come' || bet.type === 'dontCome') {
        bet.pointNumber = roll.total
        bet.isContract = bet.type === 'come' // come becomes contract
      }
      // Pass/Don't Pass point_established is handled by the state transition
    }
  }

  /**
   * Execute a full roll lifecycle.
   */
  function executeRoll(preRolledDie1?: number, preRolledDie2?: number): {
    roll: DiceRoll
    resolutions: BetResolution[]
    newPhase: GamePhase
    newPoint: number | null
    stickmanCall: { message: string, type: '' | 'natural' | 'craps' | 'point' | 'winner' | 'sevenout' | 'neutral' }
  } {
    const currentPhase = store.phase as GamePhase
    const currentPoint = store.point

    // 1. Roll dice (use pre-rolled values if provided, otherwise roll fresh)
    let roll: DiceRoll
    if (preRolledDie1 !== undefined && preRolledDie2 !== undefined) {
      roll = {
        die1: preRolledDie1,
        die2: preRolledDie2,
        total: preRolledDie1 + preRolledDie2,
        isHard: preRolledDie1 === preRolledDie2
      }
    } else {
      roll = rollDice()
    }
    store.setCurrentRoll(roll)

    // 2. Resolve all bets
    const resolutions = resolveRoll(
      roll,
      store.activeBets,
      currentPhase,
      store.tableRules,
      currentPoint
    )

    // 3. Handle point_established for Come/Don't Come bets
    applyPointEstablished(resolutions, roll)

    // 4. Filter out point_established from resolutions that go to the store
    // (they're informational, the bet stays active)
    const actionableResolutions = resolutions.filter(
      r => r.outcome !== 'point_established'
    )

    // 5. Apply resolutions to the store
    if (actionableResolutions.length > 0) {
      store.applyResolutions(actionableResolutions)
    }

    // 6. Return orphaned OFF odds whose parent bet was just resolved
    // (e.g., Come Odds OFF on come-out when 7 rolls and parent Come loses)
    const orphanedOdds = store.activeBets.filter((b) => {
      if (b.status === 'resolved') return false
      if (b.type === 'comeOdds' || b.type === 'dontComeOdds') {
        // Check if parent come/dontCome with same pointNumber was just resolved
        const parentType = b.type === 'comeOdds' ? 'come' : 'dontCome'
        const parentResolved = actionableResolutions.some(
          r => r.betType === parentType && r.owner === b.owner
            && (r.outcome === 'win' || r.outcome === 'lose')
        )
        return parentResolved && !isBetWorking(b, currentPhase)
      }
      if (b.type === 'passOdds' || b.type === 'dontPassOdds') {
        const parentType = b.type === 'passOdds' ? 'pass' : 'dontPass'
        const parentResolved = actionableResolutions.some(
          r => r.betType === parentType && r.owner === b.owner
            && (r.outcome === 'win' || r.outcome === 'lose')
        )
        return parentResolved && !isBetWorking(b, currentPhase)
      }
      return false
    })
    for (const bet of orphanedOdds) {
      store.removeBet(bet.id)
    }

    // 7. State transition
    const { newPhase, newPoint } = transition(currentPhase, roll, currentPoint)
    store.setPoint(newPoint)
    store.setPhase(newPhase)

    // 8. If seven-out, return all remaining (OFF) bets to their owners
    if (newPhase === 'SEVEN_OUT') {
      store.sessionStats.pointsMissed++

      // Every working bet already resolved on the 7. Anything still active
      // was OFF — off bets are not at risk, so return them to their owners.
      const offBets = store.activeBets.filter(b => b.status !== 'resolved')
      for (const bet of offBets) {
        const vigRefund = isBuyBet(bet.type) && store.tableRules.buyVigTiming === 'on_bet'
          ? calculateVig(bet.amount)
          : 0
        store.removeBet(bet.id, vigRefund)
      }

      store.advanceShooter()
      store.setPhase('COME_OUT')
    }

    // Track point stats
    if (currentPhase === 'COME_OUT' && newPhase === 'POINT_PHASE') {
      store.sessionStats.pointsEstablished++
    }
    if (currentPhase === 'POINT_PHASE' && newPhase === 'COME_OUT' && roll.total === currentPoint) {
      store.sessionStats.pointsMade++
    }

    // 9. Stickman call
    const stickmanCall = getStickmanCall(roll, currentPhase, currentPoint)
    store.setStickmanCall(stickmanCall.message, stickmanCall.type)

    // 10. Reset don't-bet removal tracking on new come-out cycle
    if (newPhase === 'COME_OUT' && currentPhase !== 'COME_OUT') {
      store.dontBetRemovedThisCycle = new Set()
    }

    // 11. Update working status for bets on phase transition
    if (currentPhase === 'COME_OUT' && newPhase === 'POINT_PHASE') {
      // Entering point phase: turn on Place/Buy/Hardways that were off
      for (const bet of store.activeBets) {
        if (bet.status === 'resolved') continue
        if (isPlaceBet(bet.type) || isBuyBet(bet.type) || isHardwayBet(bet.type)) {
          bet.isWorking = getDefaultWorking(bet.type, newPhase, store.tableRules)
        }
        if (bet.type === 'passOdds' || bet.type === 'comeOdds') {
          bet.isWorking = getDefaultWorking(bet.type, newPhase, store.tableRules)
        }
      }
    }
    if (newPhase === 'COME_OUT' && currentPhase !== 'COME_OUT') {
      // Returning to come-out: turn off Place/Buy/Hardways by default
      for (const bet of store.activeBets) {
        if (bet.status === 'resolved') continue
        if (isPlaceBet(bet.type) || isBuyBet(bet.type) || isHardwayBet(bet.type)) {
          bet.isWorking = getDefaultWorking(bet.type, newPhase, store.tableRules)
        }
        if (bet.type === 'passOdds' || bet.type === 'comeOdds') {
          bet.isWorking = getDefaultWorking(bet.type, newPhase, store.tableRules)
        }
      }
    }

    // 12. Save state
    store.saveToLocalStorage()

    return {
      roll,
      resolutions,
      newPhase: store.phase as GamePhase,
      newPoint: store.point,
      stickmanCall
    }
  }

  return { executeRoll }
}
