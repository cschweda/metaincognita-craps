import type { DiceRoll, ActiveBet, BetResolution, GamePhase, TableRules, BetType } from '../utils/betTypes'
import {
  betTypeToNumber,
  isPlaceBet,
  isBuyBet,
  isLayBet,
  isHardwayBet,
  POINT_NUMBERS
} from '../utils/betTypes'
import { crapsConfig } from '../../craps.config'
import {
  applyRatio,
  calculatePayout,
  calculateFieldPayout,
  calculateCEPayout,
  calculateHornPayout,
  calculateHornHighPayout
} from './payouts'

export const FIELD_NUMBERS = new Set([2, 3, 4, 9, 10, 11, 12])

export interface StickmanCall {
  message: string
  type: '' | 'natural' | 'craps' | 'point' | 'winner' | 'sevenout' | 'neutral'
}

/**
 * Resolution order per Doc 02.
 * Lower number = resolved first.
 */
export function getResolutionOrder(type: BetType): number {
  if (type === 'pass') return 0
  if (type === 'passOdds') return 1
  if (type === 'come') return 2 // both pending and established
  if (type === 'comeOdds') return 3
  if (type === 'dontPass') return 4
  if (type === 'dontPassOdds') return 5
  if (type === 'dontCome') return 6
  if (type === 'dontComeOdds') return 7
  if (isPlaceBet(type)) return 10
  if (isBuyBet(type)) return 11
  if (isLayBet(type)) return 12
  if (type === 'field') return 20
  if (isHardwayBet(type)) return 30
  // Props
  if (type === 'any7') return 40
  if (type === 'anyCraps') return 41
  if (type === 'aces') return 42
  if (type === 'boxcars') return 43
  if (type === 'aceDeuce') return 44
  if (type === 'yo') return 45
  if (type === 'crapsEleven') return 46
  if (type === 'horn' || type === 'hornHigh') return 47
  if (type === 'hopEasy' || type === 'hopHard') return 48
  // Big 6/8
  if (type === 'big6' || type === 'big8') return 50
  return 99
}

/**
 * Check if a bet is currently working given the game phase.
 */
export function isBetWorking(bet: ActiveBet, phase: GamePhase): boolean {
  // Lay bets are ALWAYS working
  if (isLayBet(bet.type)) return true
  // Don't Come flat bets are ALWAYS working
  if (bet.type === 'dontCome' && bet.pointNumber !== null) return true
  // Don't Come / Don't Pass odds are ALWAYS working
  if (bet.type === 'dontComeOdds' || bet.type === 'dontPassOdds') return true

  // During come-out, Place/Buy/Hardways/PassOdds/ComeOdds are OFF by default
  if (phase === 'COME_OUT') {
    if (isPlaceBet(bet.type) || isBuyBet(bet.type) || isHardwayBet(bet.type)) {
      return bet.isWorking // only if explicitly toggled on
    }
    if (bet.type === 'passOdds' || bet.type === 'comeOdds') {
      return bet.isWorking
    }
  }

  return true // all other bets are working
}

/**
 * Core resolution function. Determines outcome for every active bet.
 */
export function resolveRoll(
  roll: DiceRoll,
  activeBets: ActiveBet[],
  phase: GamePhase,
  tableRules: TableRules,
  point: number | null
): BetResolution[] {
  const resolutions: BetResolution[] = []

  // Sort bets by resolution order
  const sorted = [...activeBets]
    .filter(b => b.status !== 'resolved')
    .sort((a, b) => getResolutionOrder(a.type) - getResolutionOrder(b.type))

  for (const bet of sorted) {
    const resolution = resolveSingleBet(bet, roll, phase, tableRules, point)
    if (resolution) {
      resolutions.push(resolution)
    }
  }

  return resolutions
}

export function resolveSingleBet(
  bet: ActiveBet,
  roll: DiceRoll,
  phase: GamePhase,
  tableRules: TableRules,
  point: number | null
): BetResolution | null {
  const { total, isHard } = roll
  const { type, amount } = bet

  // Check if bet is working
  if (!isBetWorking(bet, phase)) {
    return null // no action, bet is off
  }

  // --- PASS LINE ---
  if (type === 'pass') {
    if (phase === 'COME_OUT') {
      if (total === 7 || total === 11) {
        const payout = calculatePayout(bet, tableRules)
        return makeResolution(bet, 'win', payout, `Pass Line wins on ${total}`)
      }
      if (total === 2 || total === 3 || total === 12) {
        return makeResolution(bet, 'lose', 0, `Pass Line loses on ${total}`)
      }
      // Point established - no resolution yet
      return makeResolution(bet, 'point_established', 0, `Point is ${total}`)
    }
    if (phase === 'POINT_PHASE') {
      if (total === point) {
        const payout = calculatePayout(bet, tableRules)
        return makeResolution(bet, 'win', payout, `Pass Line wins - point ${point} made!`)
      }
      if (total === 7) {
        return makeResolution(bet, 'lose', 0, 'Pass Line loses - seven out')
      }
    }
    return null
  }

  // --- DON'T PASS ---
  if (type === 'dontPass') {
    if (phase === 'COME_OUT') {
      if (total === 2 || total === 3) {
        const payout = calculatePayout(bet, tableRules)
        return makeResolution(bet, 'win', payout, `Don't Pass wins on ${total}`)
      }
      if (total === 12) {
        return makeResolution(bet, 'push', 0, 'Don\'t Pass pushes on 12 (bar)')
      }
      if (total === 7 || total === 11) {
        return makeResolution(bet, 'lose', 0, `Don't Pass loses on ${total}`)
      }
      return makeResolution(bet, 'point_established', 0, `Point is ${total}`)
    }
    if (phase === 'POINT_PHASE') {
      if (total === 7) {
        const payout = calculatePayout(bet, tableRules)
        return makeResolution(bet, 'win', payout, 'Don\'t Pass wins - seven out')
      }
      if (total === point) {
        return makeResolution(bet, 'lose', 0, `Don't Pass loses - point ${point} made`)
      }
    }
    return null
  }

  // --- PASS ODDS ---
  if (type === 'passOdds') {
    if (phase === 'POINT_PHASE') {
      if (total === point) {
        const payout = calculatePayout(bet, tableRules)
        return makeResolution(bet, 'win', payout, `Pass Odds wins - point ${point} made`)
      }
      if (total === 7) {
        return makeResolution(bet, 'lose', 0, 'Pass Odds loses - seven out')
      }
    }
    return null
  }

  // --- DON'T PASS ODDS ---
  if (type === 'dontPassOdds') {
    if (phase === 'POINT_PHASE') {
      if (total === 7) {
        const payout = calculatePayout(bet, tableRules)
        return makeResolution(bet, 'win', payout, 'Don\'t Pass Odds wins - seven out')
      }
      if (total === point) {
        return makeResolution(bet, 'lose', 0, `Don't Pass Odds loses - point ${point} made`)
      }
    }
    return null
  }

  // --- COME (pending - no point established yet) ---
  if (type === 'come' && bet.pointNumber === null) {
    if (total === 7 || total === 11) {
      const payout = calculatePayout(bet, tableRules)
      return makeResolution(bet, 'win', payout, `Come wins on ${total}`)
    }
    if (total === 2 || total === 3 || total === 12) {
      return makeResolution(bet, 'lose', 0, `Come loses on ${total}`)
    }
    // Establishes come point
    return makeResolution(bet, 'point_established', 0, `Come point established on ${total}`)
  }

  // --- COME (established - has a point) ---
  if (type === 'come' && bet.pointNumber !== null) {
    if (total === bet.pointNumber) {
      const payout = calculatePayout(bet, tableRules)
      return makeResolution(bet, 'win', payout, `Come wins - ${bet.pointNumber} hit`)
    }
    if (total === 7) {
      return makeResolution(bet, 'lose', 0, 'Come loses - seven out')
    }
    return null
  }

  // --- DON'T COME (pending) ---
  if (type === 'dontCome' && bet.pointNumber === null) {
    if (total === 2 || total === 3) {
      const payout = calculatePayout(bet, tableRules)
      return makeResolution(bet, 'win', payout, `Don't Come wins on ${total}`)
    }
    if (total === 12) {
      return makeResolution(bet, 'push', 0, 'Don\'t Come pushes on 12 (bar)')
    }
    if (total === 7 || total === 11) {
      return makeResolution(bet, 'lose', 0, `Don't Come loses on ${total}`)
    }
    return makeResolution(bet, 'point_established', 0, `Don't Come point established on ${total}`)
  }

  // --- DON'T COME (established) ---
  if (type === 'dontCome' && bet.pointNumber !== null) {
    if (total === 7) {
      const payout = calculatePayout(bet, tableRules)
      return makeResolution(bet, 'win', payout, 'Don\'t Come wins - seven out')
    }
    if (total === bet.pointNumber) {
      return makeResolution(bet, 'lose', 0, `Don't Come loses - ${bet.pointNumber} hit`)
    }
    return null
  }

  // --- COME ODDS ---
  if (type === 'comeOdds') {
    if (bet.pointNumber !== null) {
      if (total === bet.pointNumber) {
        const payout = calculatePayout(bet, tableRules)
        return makeResolution(bet, 'win', payout, `Come Odds wins - ${bet.pointNumber} hit`)
      }
      if (total === 7) {
        return makeResolution(bet, 'lose', 0, 'Come Odds loses - seven out')
      }
    }
    return null
  }

  // --- DON'T COME ODDS ---
  if (type === 'dontComeOdds') {
    if (bet.pointNumber !== null) {
      if (total === 7) {
        const payout = calculatePayout(bet, tableRules)
        return makeResolution(bet, 'win', payout, 'Don\'t Come Odds wins - seven out')
      }
      if (total === bet.pointNumber) {
        return makeResolution(bet, 'lose', 0, `Don't Come Odds loses - ${bet.pointNumber} hit`)
      }
    }
    return null
  }

  // --- PLACE BETS ---
  if (isPlaceBet(type)) {
    const num = betTypeToNumber(type)
    if (num === null) return null
    if (total === num) {
      const payout = calculatePayout(bet, tableRules)
      return makeResolution(bet, 'win', payout, `Place ${num} wins`)
    }
    if (total === 7) {
      return makeResolution(bet, 'lose', 0, `Place ${num} loses - seven out`)
    }
    return null
  }

  // --- BUY BETS ---
  if (isBuyBet(type)) {
    const num = betTypeToNumber(type)
    if (num === null) return null
    if (total === num) {
      const payout = calculatePayout(bet, tableRules)
      return makeResolution(bet, 'win', payout, `Buy ${num} wins`)
    }
    if (total === 7) {
      return makeResolution(bet, 'lose', 0, `Buy ${num} loses - seven out`)
    }
    return null
  }

  // --- LAY BETS (always working) ---
  if (isLayBet(type)) {
    const num = betTypeToNumber(type)
    if (num === null) return null
    if (total === 7) {
      const payout = calculatePayout(bet, tableRules)
      return makeResolution(bet, 'win', payout, `Lay ${num} wins on 7`)
    }
    if (total === num) {
      return makeResolution(bet, 'lose', 0, `Lay ${num} loses - ${num} hit`)
    }
    return null
  }

  // --- FIELD ---
  if (type === 'field') {
    if (FIELD_NUMBERS.has(total)) {
      const payout = calculateFieldPayout(amount, total, tableRules)
      return makeResolution(bet, 'win', payout, `Field wins on ${total}`)
    }
    return makeResolution(bet, 'lose', 0, `Field loses on ${total}`)
  }

  // --- HARDWAYS ---
  if (isHardwayBet(type)) {
    const num = betTypeToNumber(type)
    if (num === null) return null
    if (total === num && isHard) {
      const payout = calculatePayout(bet, tableRules)
      return makeResolution(bet, 'win', payout, `Hard ${num} wins!`)
    }
    if (total === num && !isHard) {
      return makeResolution(bet, 'lose', 0, `Hard ${num} loses - ${num} came easy`)
    }
    if (total === 7) {
      return makeResolution(bet, 'lose', 0, `Hard ${num} loses - seven out`)
    }
    return null
  }

  // --- PROPOSITION BETS ---
  if (type === 'any7') {
    if (total === 7) {
      const payout = calculatePayout(bet, tableRules)
      return makeResolution(bet, 'win', payout, 'Any 7 wins!')
    }
    return makeResolution(bet, 'lose', 0, 'Any 7 loses')
  }

  if (type === 'anyCraps') {
    if (total === 2 || total === 3 || total === 12) {
      const payout = calculatePayout(bet, tableRules)
      return makeResolution(bet, 'win', payout, `Any Craps wins on ${total}`)
    }
    return makeResolution(bet, 'lose', 0, 'Any Craps loses')
  }

  if (type === 'aces') {
    if (total === 2) {
      const payout = calculatePayout(bet, tableRules)
      return makeResolution(bet, 'win', payout, 'Aces wins!')
    }
    return makeResolution(bet, 'lose', 0, 'Aces loses')
  }

  if (type === 'boxcars') {
    if (total === 12) {
      const payout = calculatePayout(bet, tableRules)
      return makeResolution(bet, 'win', payout, 'Boxcars wins!')
    }
    return makeResolution(bet, 'lose', 0, 'Boxcars loses')
  }

  if (type === 'aceDeuce') {
    if (total === 3) {
      const payout = calculatePayout(bet, tableRules)
      return makeResolution(bet, 'win', payout, 'Ace-Deuce wins!')
    }
    return makeResolution(bet, 'lose', 0, 'Ace-Deuce loses')
  }

  if (type === 'yo') {
    if (total === 11) {
      const payout = calculatePayout(bet, tableRules)
      return makeResolution(bet, 'win', payout, 'Yo-Eleven wins!')
    }
    return makeResolution(bet, 'lose', 0, 'Yo-Eleven loses')
  }

  // --- C&E ---
  if (type === 'crapsEleven') {
    if (total === 2 || total === 3 || total === 12 || total === 11) {
      const payout = calculateCEPayout(amount, total)
      return makeResolution(bet, 'win', payout, `C&E wins on ${total}`)
    }
    return makeResolution(bet, 'lose', 0, 'C&E loses')
  }

  // --- HORN ---
  if (type === 'horn') {
    if (total === 2 || total === 3 || total === 11 || total === 12) {
      const payout = calculateHornPayout(amount, total)
      return makeResolution(bet, 'win', payout, `Horn wins on ${total}`)
    }
    return makeResolution(bet, 'lose', 0, 'Horn loses')
  }

  // --- HORN HIGH (5-unit bet, 2 units on the high number) ---
  if (type === 'hornHigh') {
    if (total === 2 || total === 3 || total === 11 || total === 12) {
      const payout = calculateHornHighPayout(amount, total)
      return makeResolution(bet, 'win', payout, `Horn High wins on ${total}`)
    }
    return makeResolution(bet, 'lose', 0, 'Horn High loses')
  }

  // --- HOP BETS (one-roll bet on a specific dice combination) ---
  if (type === 'hopHard') {
    // Hop hard: wins on a specific hard total (e.g., 4-4). isHard means both dice match.
    if (isHard && bet.pointNumber !== null && total === bet.pointNumber) {
      const payout = amount + applyRatio(amount, crapsConfig.payouts.hopHard.win)
      return makeResolution(bet, 'win', payout, `Hop Hard ${total} wins!`)
    }
    return makeResolution(bet, 'lose', 0, 'Hop Hard loses')
  }

  if (type === 'hopEasy') {
    // Hop easy: wins on a specific non-hard combination (e.g., 3-1 for total 4).
    if (!isHard && bet.pointNumber !== null && total === bet.pointNumber) {
      const payout = amount + applyRatio(amount, crapsConfig.payouts.hopEasy.win)
      return makeResolution(bet, 'win', payout, `Hop Easy ${total} wins!`)
    }
    return makeResolution(bet, 'lose', 0, 'Hop Easy loses')
  }

  // --- BIG 6 ---
  if (type === 'big6') {
    if (total === 6) {
      const payout = calculatePayout(bet, tableRules)
      return makeResolution(bet, 'win', payout, 'Big 6 wins')
    }
    if (total === 7) {
      return makeResolution(bet, 'lose', 0, 'Big 6 loses - seven out')
    }
    return null
  }

  // --- BIG 8 ---
  if (type === 'big8') {
    if (total === 8) {
      const payout = calculatePayout(bet, tableRules)
      return makeResolution(bet, 'win', payout, 'Big 8 wins')
    }
    if (total === 7) {
      return makeResolution(bet, 'lose', 0, 'Big 8 loses - seven out')
    }
    return null
  }

  return null
}

export function makeResolution(
  bet: ActiveBet,
  outcome: BetResolution['outcome'],
  payout: number,
  description: string
): BetResolution {
  let netGain = 0
  if (outcome === 'win') {
    netGain = payout - bet.amount // payout includes original wager
  } else if (outcome === 'lose') {
    netGain = -bet.amount
  }
  // push and no_action: netGain = 0
  // point_established: netGain = 0

  return {
    betId: bet.id,
    betType: bet.type,
    owner: bet.owner,
    outcome,
    payout,
    netGain,
    description
  }
}

/**
 * State machine transition.
 */
export function transition(
  phase: GamePhase,
  roll: DiceRoll,
  point: number | null
): { newPhase: GamePhase, newPoint: number | null } {
  const { total } = roll

  if (phase === 'COME_OUT') {
    if (total === 7 || total === 11) {
      // Natural - stay on come-out
      return { newPhase: 'COME_OUT', newPoint: null }
    }
    if (total === 2 || total === 3 || total === 12) {
      // Craps - stay on come-out
      return { newPhase: 'COME_OUT', newPoint: null }
    }
    // Point established
    return { newPhase: 'POINT_PHASE', newPoint: total }
  }

  if (phase === 'POINT_PHASE') {
    if (total === point) {
      // Point made - back to come-out
      return { newPhase: 'COME_OUT', newPoint: null }
    }
    if (total === 7) {
      // Seven-out
      return { newPhase: 'SEVEN_OUT', newPoint: null }
    }
    // Any other roll - stay in point phase
    return { newPhase: 'POINT_PHASE', newPoint: point }
  }

  return { newPhase: phase, newPoint: point }
}

/**
 * Get the stickman call for a roll.
 */
export function getStickmanCall(
  roll: DiceRoll,
  phase: GamePhase,
  point: number | null
): StickmanCall {
  const { die1, die2, total, isHard } = roll

  // Seven-out during point phase
  if (phase === 'POINT_PHASE' && total === 7) {
    return { message: 'Seven out! Line away!', type: 'sevenout' }
  }

  // Point made
  if (phase === 'POINT_PHASE' && total === point) {
    const hardStr = isHard ? ' the hard way' : ''
    return { message: `${total}! Winner${hardStr}! Pay the line!`, type: 'winner' }
  }

  // Come-out naturals
  if (phase === 'COME_OUT' && (total === 7 || total === 11)) {
    if (total === 7) return { message: 'Seven! Winner! Front line winner!', type: 'natural' }
    return { message: 'Yo-eleven! Winner!', type: 'natural' }
  }

  // Come-out craps
  if (phase === 'COME_OUT' && (total === 2 || total === 3 || total === 12)) {
    if (total === 2) return { message: 'Aces! Craps! Line away.', type: 'craps' }
    if (total === 3) return { message: 'Ace-deuce! Craps! Line away.', type: 'craps' }
    return { message: 'Boxcars! Craps! Line away.', type: 'craps' }
  }

  // Point established on come-out
  if (phase === 'COME_OUT' && POINT_NUMBERS.includes(total as typeof POINT_NUMBERS[number])) {
    return { message: `Point is ${total}. Mark it.`, type: 'point' }
  }

  // Regular rolls during point phase
  const callNames: Record<number, string> = {
    2: 'Aces',
    3: 'Ace-deuce',
    4: isHard ? 'Hard four' : 'Four, easy',
    5: 'Five, no field',
    6: isHard ? 'Hard six' : 'Six, easy',
    8: isHard ? 'Hard eight' : 'Eight, easy',
    9: 'Nina',
    10: isHard ? 'Hard ten' : 'Ten, easy',
    11: 'Yo-eleven',
    12: 'Boxcars'
  }

  const name = callNames[total] ?? String(total)
  return { message: `${name}. ${die1} and ${die2}.`, type: 'neutral' }
}
