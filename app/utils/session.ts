import type {
  ActiveBet, BetType, BetTypeStats, DiceRoll, GamePhase, PlayerState, SessionStats, TableRules
} from './betTypes'
import { ALL_BET_TYPES, POINT_NUMBERS } from './betTypes'
import { sanitizeName } from './sanitize'
import { crapsConfig } from '../../craps.config'

/** Everything the store persists between visits. */
export interface PersistedSession {
  phase: Extract<GamePhase, 'COME_OUT' | 'POINT_PHASE'>
  point: number | null
  puckState: 'ON' | 'OFF'
  shooterSeat: number
  rollNumber: number
  shooterRollCount: number
  currentRoll: DiceRoll | null
  rollHistory: DiceRoll[]
  activeBets: ActiveBet[]
  tableRules: TableRules
  players: PlayerState[]
  sessionStats: SessionStats
  selectedChipValue: number
  dontBetRemovedThisCycle: string[]
}

type Rec = Record<string, unknown>

const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v)
/** Whole, safe, non-negative — every count and every positive money amount (cents). */
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0
/** Whole and safe, may be negative — profit/loss figures. */
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v)
const isBool = (v: unknown): v is boolean => typeof v === 'boolean'

const BET_TYPES = new Set<string>(ALL_BET_TYPES)
const POINTS = new Set<number>(POINT_NUMBERS)

function parseRoll(v: unknown): DiceRoll | null {
  if (!isRec(v)) return null
  const { die1, die2 } = v
  if (!isCount(die1) || !isCount(die2)) return null
  if (die1 < 1 || die1 > 6 || die2 < 1 || die2 > 6) return null
  // Derived fields are recomputed, never trusted.
  return { die1, die2, total: die1 + die2, isHard: die1 === die2 }
}

function parseRolls(v: unknown, cap: number): DiceRoll[] | null {
  if (!Array.isArray(v)) return null
  const rolls: DiceRoll[] = []
  for (const item of v.slice(0, cap)) {
    const roll = parseRoll(item)
    if (!roll) return null
    rolls.push(roll)
  }
  return rolls
}

function parseMoneyHistory(v: unknown): number[] | null {
  if (!Array.isArray(v) || !v.every(isCount)) return null
  return v.slice(-crapsConfig.stats.bankrollHistorySize)
}

function parseTableRules(v: unknown): TableRules | null {
  if (!isRec(v)) return null
  const { minBet, maxBet, oddsMultiple, fieldTwelvePayout, buyVigTiming, hardwaysOnComeOut, payoutRounding } = v
  if (!isCount(minBet) || !isCount(maxBet) || minBet < 1 || maxBet < minBet) return null
  if (typeof oddsMultiple !== 'string' || !Object.hasOwn(crapsConfig.oddsMultiples, oddsMultiple)) return null
  if (fieldTwelvePayout !== 2 && fieldTwelvePayout !== 3) return null
  if (buyVigTiming !== 'on_bet' && buyVigTiming !== 'on_win') return null
  if (!isBool(hardwaysOnComeOut)) return null
  if (payoutRounding !== 'dollar' && payoutRounding !== 'quarter' && payoutRounding !== 'exact') return null
  return { minBet, maxBet, oddsMultiple, fieldTwelvePayout, buyVigTiming, hardwaysOnComeOut, payoutRounding }
}

function parsePlayers(v: unknown): PlayerState[] | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > crapsConfig.table.maxPlayers) return null
  const players: PlayerState[] = []
  const ids = new Set<string>()
  for (const [i, item] of v.entries()) {
    if (!isRec(item)) return null
    const { id, name, bankroll, startingBankroll, isBusted, strategy, lossStreak } = item
    // Seat 0 is always the hero; every other seat is a bot.
    const expectedId = i === 0 ? 'hero' : /^bot-\d+$/
    if (typeof id !== 'string' || ids.has(id)) return null
    if (typeof expectedId === 'string' ? id !== expectedId : !expectedId.test(id)) return null
    if (typeof name !== 'string') return null
    if (!isCount(bankroll) || !isCount(startingBankroll)) return null
    if (strategy !== null && typeof strategy !== 'string') return null
    const history = parseMoneyHistory(item.bankrollHistory)
    if (!history) return null
    ids.add(id)
    players.push({
      id,
      name: sanitizeName(name) || (i === 0 ? 'Hero' : 'Player'),
      bankroll,
      startingBankroll,
      isHero: i === 0,
      isBusted: isBool(isBusted) ? isBusted : false,
      strategy: typeof strategy === 'string' ? strategy.slice(0, 64) : null,
      // Absent in sessions saved before bots placed bets.
      lossStreak: isCount(lossStreak) && lossStreak <= 64 ? lossStreak : 0,
      bankrollHistory: history
    })
  }
  return players
}

function parseBets(v: unknown, playerIds: Set<string>): ActiveBet[] | null {
  if (!Array.isArray(v) || v.length > 500) return null
  const bets: ActiveBet[] = []
  const ids = new Set<string>()
  for (const item of v) {
    if (!isRec(item)) return null
    const { id, type, owner, amount, pointNumber, isContract, isWorking, placedOnRoll } = item
    if (typeof id !== 'string' || !/^bet-\d+$/.test(id) || ids.has(id)) return null
    if (typeof type !== 'string' || !BET_TYPES.has(type)) return null
    if (typeof owner !== 'string' || !playerIds.has(owner)) return null
    if (!isCount(amount) || amount < 1) return null
    if (pointNumber !== null && !(isCount(pointNumber) && pointNumber >= 2 && pointNumber <= 12)) return null
    if (!isBool(isContract) || !isBool(isWorking) || !isCount(placedOnRoll)) return null
    ids.add(id)
    bets.push({
      id,
      type: type as BetType,
      owner,
      amount,
      oddsAmount: 0,
      pointNumber,
      isContract,
      isWorking,
      // Resolved bets are swept before every save; anything stored is live.
      status: 'active',
      placedOnRoll,
      resolvedOnRoll: null
    })
  }
  return bets
}

function parseBetTypeStats(v: unknown): Record<string, BetTypeStats> | null {
  if (!isRec(v)) return null
  const out: Record<string, BetTypeStats> = {}
  for (const [type, stats] of Object.entries(v)) {
    if (!BET_TYPES.has(type) || !isRec(stats)) return null
    const { timesPlaced, won, lost, pushed, totalWagered, netProfitLoss } = stats
    if (!isCount(timesPlaced) || !isCount(won) || !isCount(lost) || !isCount(pushed)) return null
    if (!isCount(totalWagered) || !isInt(netProfitLoss)) return null
    out[type] = { timesPlaced, won, lost, pushed, totalWagered, netProfitLoss }
  }
  return out
}

function parseSessionStats(v: unknown): SessionStats | null {
  if (!isRec(v)) return null
  const { rollsWitnessed, pointsEstablished, pointsMade, pointsMissed, totalWagered, totalProfitLoss, longestShooterRolls } = v
  if (!isCount(rollsWitnessed) || !isCount(pointsEstablished) || !isCount(pointsMade) || !isCount(pointsMissed)) return null
  if (!isCount(totalWagered) || !isInt(totalProfitLoss) || !isCount(longestShooterRolls)) return null
  const betTypeStats = parseBetTypeStats(v.betTypeStats)
  const bankrollHistory = parseMoneyHistory(v.bankrollHistory)
  if (!betTypeStats || !bankrollHistory) return null
  return {
    rollsWitnessed, pointsEstablished, pointsMade, pointsMissed,
    totalWagered, totalProfitLoss, longestShooterRolls, betTypeStats, bankrollHistory
  }
}

/**
 * Validate a session read back from localStorage.
 *
 * Stored state is untrusted input: it may be from an older build, truncated
 * by a full disk, or edited by hand. Returns a freshly built object holding
 * only known fields, or null if anything is missing, mistyped, or internally
 * inconsistent — the caller then discards the session rather than letting a
 * half-valid one crash the table mid-roll.
 */
export function parseSession(data: unknown): PersistedSession | null {
  if (!isRec(data)) return null

  const { phase, point, shooterSeat, rollNumber, shooterRollCount } = data
  if (phase !== 'COME_OUT' && phase !== 'POINT_PHASE') return null
  if (point !== null && !(isCount(point) && POINTS.has(point))) return null
  // The puck is ON exactly when a point is set, in exactly the point phase.
  if ((phase === 'POINT_PHASE') !== (point !== null)) return null
  if (!isCount(rollNumber) || !isCount(shooterRollCount)) return null

  const tableRules = parseTableRules(data.tableRules)
  const players = parsePlayers(data.players)
  const sessionStats = parseSessionStats(data.sessionStats)
  if (!tableRules || !players || !sessionStats) return null
  if (!isCount(shooterSeat) || shooterSeat >= players.length) return null

  const playerIds = new Set(players.map(p => p.id))
  const activeBets = parseBets(data.activeBets ?? [], playerIds)
  const rollHistory = parseRolls(data.rollHistory ?? [], crapsConfig.stats.rollHistorySize)
  if (!activeBets || !rollHistory) return null

  const currentRoll = data.currentRoll == null ? null : parseRoll(data.currentRoll)
  if (data.currentRoll != null && !currentRoll) return null

  const chip = data.selectedChipValue
  const removed = Array.isArray(data.dontBetRemovedThisCycle) ? data.dontBetRemovedThisCycle : []

  return {
    phase,
    point,
    puckState: point !== null ? 'ON' : 'OFF',
    shooterSeat,
    rollNumber,
    shooterRollCount,
    currentRoll,
    rollHistory,
    activeBets,
    tableRules,
    players,
    sessionStats,
    selectedChipValue: isCount(chip) && chip >= 1 ? chip : tableRules.minBet,
    dontBetRemovedThisCycle: removed.filter((key): key is string => {
      if (typeof key !== 'string') return false
      const match = key.match(/^(.+)-(dontPass|dontCome)$/)
      return !!match && playerIds.has(match[1]!)
    })
  }
}
