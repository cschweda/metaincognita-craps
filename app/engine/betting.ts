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

export interface OddsRoom {
  /** The point these odds would ride on. */
  point: number
  /** Table limit for odds behind the flat bet(s) on this point. */
  max: number
  /** Odds already riding there. */
  existing: number
  remaining: number
}

/**
 * Every spot where `owner` could put odds of this type, with how much room
 * the table limit leaves on each. Line odds have at most one spot (the table
 * point); come-side odds have one per established come point, in placement
 * order. Empty when there is no flat bet to back.
 */
export function listOddsRoom(
  type: OddsType,
  owner: string,
  activeBets: ActiveBet[],
  tablePoint: number | null,
  oddsMultiple: string
): OddsRoom[] {
  const isLine = type === 'passOdds' || type === 'dontPassOdds'
  const isDont = type === 'dontPassOdds' || type === 'dontComeOdds'
  const mine = activeBets.filter(b => b.owner === owner && isLive(b))
  const parents = mine.filter(b => b.type === ODDS_PARENT[type] && (isLine || b.pointNumber !== null))
  if (parents.length === 0) return []
  if (isLine && !tablePoint) return []

  const points = isLine ? [tablePoint!] : [...new Set(parents.map(b => b.pointNumber!))]
  return points.map((point) => {
    const flat = parents
      .filter(b => isLine || b.pointNumber === point)
      .reduce((sum, b) => sum + b.amount, 0)
    const max = isDont
      ? getMaxLayOdds(flat, point, oddsMultiple)
      : getMaxOdds(flat, point, oddsMultiple)
    const existing = mine
      .filter(b => b.type === type && b.pointNumber === point)
      .reduce((sum, b) => sum + b.amount, 0)
    return { point, max, existing, remaining: Math.max(0, max - existing) }
  })
}

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
  const label = ODDS_LABEL[type]
  const isLine = type === 'passOdds' || type === 'dontPassOdds'
  const hasParent = activeBets.some(b =>
    b.owner === owner && isLive(b) && b.type === ODDS_PARENT[type] && (isLine || b.pointNumber !== null)
  )
  if (!hasParent) {
    return { ok: false, reason: `Must have ${label.parent} to place ${label.odds}` }
  }
  if (isLine && !tablePoint) {
    return { ok: false, reason: `${label.odds} can only be placed after a point is established` }
  }

  let rooms = listOddsRoom(type, owner, activeBets, tablePoint, oddsMultiple)
  if (!isLine && targetPoint != null) {
    rooms = rooms.filter(r => r.point === targetPoint)
    if (rooms.length === 0) {
      return { ok: false, reason: `Must have ${label.parent} on ${targetPoint} to place ${label.odds} there` }
    }
  }

  const fit = rooms.find(r => amount <= r.remaining)
  if (fit) return { ok: true, point: fit.point }

  const bestRemaining = Math.max(0, ...rooms.map(r => r.remaining))
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

/**
 * Bets a real dealer leaves up after paying them: the player collects the
 * winnings and the wager keeps working until it loses or is taken down.
 * (Line, come, odds and one-roll bets are paid and returned.)
 */
export function staysUpAfterWin(type: BetType): boolean {
  return isPlaceBet(type) || isBuyBet(type) || isLayBet(type) || isHardwayBet(type)
    || type === 'big6' || type === 'big8'
}

/**
 * Bets the player may call ON or OFF. These are exactly the bets whose
 * `isWorking` flag the resolver honours; everything else is always in action.
 */
export function canToggleWorking(type: BetType): boolean {
  return isPlaceBet(type) || isBuyBet(type) || isHardwayBet(type)
    || type === 'passOdds' || type === 'comeOdds'
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
