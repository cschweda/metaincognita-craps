import type { ActiveBet, BetType, GamePhase, TableRules } from '../utils/betTypes'
import { isPlaceBet, isBuyBet, isLayBet, isHardwayBet } from '../utils/betTypes'
import { formatCents } from '../utils/format'
import { getMaxOdds, getMaxLayOdds } from './payouts'

type OddsType = 'passOdds' | 'dontPassOdds' | 'comeOdds' | 'dontComeOdds'

/** Odds bets ride behind a flat bet; this is which one. */
export const ODDS_PARENT: Record<OddsType, BetType> = {
  passOdds: 'pass',
  dontPassOdds: 'dontPass',
  comeOdds: 'come',
  dontComeOdds: 'dontCome'
}

const ODDS_LABEL: Record<OddsType, { odds: string, parent: string }> = {
  passOdds: { odds: 'Pass Odds', parent: 'a Pass Line bet' },
  dontPassOdds: { odds: 'Don\'t Pass Odds', parent: 'a Don\'t Pass bet' },
  comeOdds: { odds: 'Come Odds', parent: 'an established Come bet' },
  dontComeOdds: { odds: 'Don\'t Come Odds', parent: 'an established Don\'t Come bet' }
}

export function isOddsType(type: BetType): type is OddsType {
  return type in ODDS_PARENT
}

const isLive = (b: ActiveBet) => b.status !== 'resolved'

/**
 * Decide which point an odds bet rides on and whether it fits under the
 * table's odds limit.
 *
 * The limit is CUMULATIVE: odds already riding behind the flat bet count
 * against it. (Checking each chip on its own let a player stack unlimited
 * zero-edge odds one click at a time.)
 *
 * Come / Don't Come odds: a player can have several come points working.
 * `targetPoint` picks one explicitly; otherwise the odds go behind the first
 * come point (in placement order) that still has room.
 */
export function resolveOddsTarget(
  type: OddsType,
  amount: number,
  owner: string,
  activeBets: ActiveBet[],
  tablePoint: number | null,
  oddsMultiple: string,
  targetPoint?: number | null
): { ok: true, point: number } | { ok: false, reason: string } {
  const parentType = ODDS_PARENT[type]
  const label = ODDS_LABEL[type]
  const isLine = type === 'passOdds' || type === 'dontPassOdds'
  const isDont = type === 'dontPassOdds' || type === 'dontComeOdds'
  const mine = activeBets.filter(b => b.owner === owner && isLive(b))

  const parents = mine.filter(b => b.type === parentType && (isLine || b.pointNumber !== null))
  if (parents.length === 0) {
    return { ok: false, reason: `Must have ${label.parent} to place ${label.odds}` }
  }

  let points: number[]
  if (isLine) {
    if (!tablePoint) {
      return { ok: false, reason: `${label.odds} can only be placed after a point is established` }
    }
    points = [tablePoint]
  } else {
    points = [...new Set(parents.map(b => b.pointNumber!))]
    if (targetPoint != null) {
      if (!points.includes(targetPoint)) {
        return { ok: false, reason: `Must have ${label.parent} on ${targetPoint} to place ${label.odds} there` }
      }
      points = [targetPoint]
    }
  }

  let bestRemaining = 0
  for (const point of points) {
    const flat = parents
      .filter(b => isLine || b.pointNumber === point)
      .reduce((sum, b) => sum + b.amount, 0)
    const max = isDont
      ? getMaxLayOdds(flat, point, oddsMultiple)
      : getMaxOdds(flat, point, oddsMultiple)
    const existing = mine
      .filter(b => b.type === type && b.pointNumber === point)
      .reduce((sum, b) => sum + b.amount, 0)
    const remaining = max - existing
    if (amount <= remaining) return { ok: true, point }
    bestRemaining = Math.max(bestRemaining, remaining)
  }

  return {
    ok: false,
    reason: bestRemaining > 0
      ? `Only ${formatCents(bestRemaining)} more ${label.odds} allowed on this bet`
      : `${label.odds} are already at the table maximum`
  }
}

/**
 * Odds bets whose flat bet is gone. Odds cannot stand alone, so the caller
 * returns these to their owner. This happens when a parent resolves while
 * its odds were OFF (Come Odds on a come-out roll), or when a Don't bet is
 * taken down from under its odds. Come-side odds must match their parent's
 * point — a player with Come bets on 6 and 8 keeps the 8's odds when the 6
 * resolves.
 */
export function findOrphanedOdds(activeBets: ActiveBet[]): ActiveBet[] {
  const live = activeBets.filter(isLive)
  return live.filter((bet) => {
    if (!isOddsType(bet.type)) return false
    const parentType = ODDS_PARENT[bet.type]
    const isLine = bet.type === 'passOdds' || bet.type === 'dontPassOdds'
    return !live.some(p =>
      p.owner === bet.owner
      && p.type === parentType
      && (isLine || p.pointNumber === bet.pointNumber)
    )
  })
}

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
