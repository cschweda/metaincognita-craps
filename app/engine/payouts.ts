import type { ActiveBet, TableRules } from '../utils/betTypes'
import { betTypeToNumber, isBuyBet, isLayBet, isPlaceBet, isHardwayBet } from '../utils/betTypes'
import { crapsConfig } from '../../craps.config'

const { payouts, oddsMultiples } = crapsConfig

/**
 * Apply a payout ratio to an amount in cents, rounding down.
 */
export function applyRatio(amountCents: number, ratio: [number, number]): number {
  return Math.floor(amountCents * ratio[0] / ratio[1])
}

/**
 * Calculate 5% vig rounded down.
 */
export function calculateVig(amountCents: number): number {
  return Math.floor(amountCents * 5 / 100)
}

/**
 * Apply payout rounding per table rules.
 * 'dollar' rounds down to nearest 100 cents.
 * 'quarter' rounds down to nearest 25 cents.
 * 'exact' no rounding (already floored by applyRatio).
 */
export function applyPayoutRounding(cents: number, rounding: TableRules['payoutRounding']): number {
  if (rounding === 'dollar') {
    return Math.floor(cents / 100) * 100
  }
  if (rounding === 'quarter') {
    return Math.floor(cents / 25) * 25
  }
  return cents
}

/**
 * Calculate the total payout in cents for a winning bet.
 * Payout = original wager + winnings (i.e. what the player receives back).
 */
export function calculatePayout(bet: ActiveBet, tableRules: TableRules): number {
  const { type, amount } = bet
  const num = betTypeToNumber(type)

  // --- Pass / Come ---
  if (type === 'pass' || type === 'come') {
    const winnings = applyRatio(amount, payouts.passLine.win)
    return amount + applyPayoutRounding(winnings, tableRules.payoutRounding)
  }

  // --- Don't Pass / Don't Come ---
  if (type === 'dontPass' || type === 'dontCome') {
    const winnings = applyRatio(amount, payouts.dontPass.win)
    return amount + applyPayoutRounding(winnings, tableRules.payoutRounding)
  }

  // --- Pass Odds ---
  if (type === 'passOdds') {
    const point = bet.pointNumber!
    const ratio = payouts.passOdds[point]
    if (!ratio) return amount
    const winnings = applyRatio(amount, ratio)
    return amount + winnings // odds pay exact, no rounding
  }

  // --- Don't Pass Odds ---
  if (type === 'dontPassOdds') {
    const point = bet.pointNumber!
    const ratio = payouts.dontOdds[point]
    if (!ratio) return amount
    const winnings = applyRatio(amount, ratio)
    return amount + winnings
  }

  // --- Come Odds ---
  if (type === 'comeOdds') {
    const point = bet.pointNumber!
    const ratio = payouts.passOdds[point]
    if (!ratio) return amount
    const winnings = applyRatio(amount, ratio)
    return amount + winnings
  }

  // --- Don't Come Odds ---
  if (type === 'dontComeOdds') {
    const point = bet.pointNumber!
    const ratio = payouts.dontOdds[point]
    if (!ratio) return amount
    const winnings = applyRatio(amount, ratio)
    return amount + winnings
  }

  // --- Place bets ---
  if (isPlaceBet(type) && num !== null) {
    const ratio = payouts.place[num]
    if (!ratio) return amount
    const winnings = applyPayoutRounding(applyRatio(amount, ratio), tableRules.payoutRounding)
    return amount + winnings
  }

  // --- Buy bets (true odds minus vig) ---
  if (isBuyBet(type) && num !== null) {
    const ratio = payouts.buy[num]
    if (!ratio) return amount
    const winnings = applyRatio(amount, ratio)
    if (tableRules.buyVigTiming === 'on_win') {
      const vig = calculateVig(winnings)
      return amount + winnings - vig
    }
    // vig already paid on placement
    return amount + winnings
  }

  // --- Lay bets (inverse true odds minus vig on win) ---
  if (isLayBet(type) && num !== null) {
    const ratio = payouts.lay[num]
    if (!ratio) return amount
    const winnings = applyRatio(amount, ratio)
    if (tableRules.buyVigTiming === 'on_win') {
      const vig = calculateVig(winnings)
      return amount + winnings - vig
    }
    return amount + winnings
  }

  // --- Hardways ---
  if (isHardwayBet(type) && num !== null) {
    const ratio = payouts.hardway[num]
    if (!ratio) return amount
    const winnings = applyRatio(amount, ratio)
    return amount + winnings
  }

  // --- Props ---
  if (type === 'any7') {
    return amount + applyRatio(amount, payouts.any7.win)
  }
  if (type === 'anyCraps') {
    return amount + applyRatio(amount, payouts.anyCraps.win)
  }
  if (type === 'aces') {
    return amount + applyRatio(amount, payouts.aces.win)
  }
  if (type === 'boxcars') {
    return amount + applyRatio(amount, payouts.boxcars.win)
  }
  if (type === 'aceDeuce') {
    return amount + applyRatio(amount, payouts.aceDeuce.win)
  }
  if (type === 'yo') {
    return amount + applyRatio(amount, payouts.yo.win)
  }

  // --- Big 6 / Big 8 ---
  if (type === 'big6') {
    return amount + applyRatio(amount, payouts.big6.win)
  }
  if (type === 'big8') {
    return amount + applyRatio(amount, payouts.big8.win)
  }

  return amount
}

/**
 * Calculate field payout for a specific total.
 */
export function calculateFieldPayout(amount: number, total: number, tableRules: TableRules): number {
  if (total === 12) {
    const ratio: [number, number] = [tableRules.fieldTwelvePayout, 1]
    return amount + applyRatio(amount, ratio)
  }
  const ratio = payouts.field[total]
  if (!ratio) return 0 // not a field number
  return amount + applyRatio(amount, ratio)
}

/**
 * Calculate C&E payout based on the roll.
 * C&E is a 2-unit bet: one unit on Any Craps, one unit on Yo-Eleven.
 * Only the winning unit pays; the other unit is lost.
 */
export function calculateCEPayout(amount: number, total: number): number {
  const unitBet = Math.floor(amount / 2)
  if (total === 11) {
    // Yo unit wins at 15:1, craps unit lost
    const unitWin = applyRatio(unitBet, payouts.ce.eleven)
    return unitBet + unitWin
  }
  if (total === 2 || total === 3 || total === 12) {
    // Craps unit wins at 7:1, yo unit lost
    const unitWin = applyRatio(unitBet, payouts.ce.craps)
    return unitBet + unitWin
  }
  return 0
}

/**
 * Calculate horn payout. Horn is a 4-unit bet split across 2, 3, 11, 12.
 * Winning unit pays its ratio; losing 3 units are lost.
 */
export function calculateHornPayout(totalBet: number, total: number): number {
  const unitBet = Math.floor(totalBet / 4)
  const ratio = payouts.horn[total]
  if (!ratio) return 0
  const unitWin = applyRatio(unitBet, ratio)
  // Player gets the winning unit back + winnings. The other 3 units are lost.
  // Since totalBet was already deducted on placement, payout = unitBet + unitWin
  return unitBet + unitWin
}

/**
 * Calculate horn high payout. Horn High is a 5-unit bet: 2 units on the
 * "high" number and 1 unit on each of the other three horn numbers.
 * The high number is determined by the winning total:
 * - If the roll matches one of the horn numbers, that number is treated as high.
 * - This matches how most casinos handle horn high (player calls "horn high yo", etc.)
 */
export function calculateHornHighPayout(totalBet: number, total: number): number {
  const unitBet = Math.floor(totalBet / 5)
  const ratio = payouts.horn[total]
  if (!ratio) return 0
  // The winning number always gets the "high" (2-unit) portion
  const winningUnits = 2
  const winAmount = applyRatio(unitBet * winningUnits, ratio)
  // Player gets back the winning portion + winnings. The other 3 units are lost.
  return (unitBet * winningUnits) + winAmount
}

/**
 * Get the max odds amount for a given flat bet amount and point.
 */
export function getMaxOdds(flatBetAmount: number, pointNumber: number, oddsMultipleKey: string): number {
  const multiples = oddsMultiples[oddsMultipleKey]
  if (!multiples) return 0
  const multiple = multiples[pointNumber]
  if (multiple === undefined) return 0
  return flatBetAmount * multiple
}
