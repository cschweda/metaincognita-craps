import type { ActiveBet, BetType, GamePhase, TableRules } from '../utils/betTypes'
import { isPlaceBet, isBuyBet, isLayBet, isHardwayBet } from '../utils/betTypes'

/**
 * Contract-bet removal rules (MBS 3.7 / 3.10): Pass Line may not be taken
 * down once the TABLE point is on; a Come bet may not be taken down once its
 * own point is established. Pass bets never carry pointNumber, so the table
 * point — not bet.pointNumber — is the trigger.
 */
export function canRemoveBet(bet: ActiveBet, tablePoint: number | null): { allowed: boolean, reason: string } {
  if (bet.type === 'pass' && tablePoint !== null) {
    return { allowed: false, reason: 'Pass Line is a contract bet — it cannot be removed after the point is established' }
  }
  if (bet.type === 'come' && bet.pointNumber !== null) {
    return { allowed: false, reason: 'Come bets are contract bets — they cannot be removed once their point is established' }
  }
  return { allowed: true, reason: '' }
}

/** Single source of truth for default working status (was duplicated in 3 places). */
export function getDefaultWorking(type: BetType, phase: GamePhase, tableRules: TableRules): boolean {
  if (isLayBet(type) || type === 'dontComeOdds' || type === 'dontPassOdds') return true
  if (phase === 'COME_OUT') {
    if (isHardwayBet(type)) return tableRules.hardwaysOnComeOut
    if (isPlaceBet(type) || isBuyBet(type) || type === 'passOdds' || type === 'comeOdds') return false
  }
  return true
}
