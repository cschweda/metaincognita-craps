export type BetType
  = | 'pass' | 'dontPass'
    | 'passOdds' | 'dontPassOdds'
    | 'come' | 'dontCome'
    | 'comeOdds' | 'dontComeOdds'
    | 'place4' | 'place5' | 'place6' | 'place8' | 'place9' | 'place10'
    | 'buy4' | 'buy5' | 'buy6' | 'buy8' | 'buy9' | 'buy10'
    | 'lay4' | 'lay5' | 'lay6' | 'lay8' | 'lay9' | 'lay10'
    | 'field'
    | 'hard4' | 'hard6' | 'hard8' | 'hard10'
    | 'any7' | 'anyCraps' | 'aces' | 'boxcars' | 'aceDeuce' | 'yo'
    | 'crapsEleven' | 'horn' | 'hornHigh'
    | 'big6' | 'big8'
    | 'hopEasy' | 'hopHard'

export const ALL_BET_TYPES: BetType[] = [
  'pass', 'dontPass', 'passOdds', 'dontPassOdds',
  'come', 'dontCome', 'comeOdds', 'dontComeOdds',
  'place4', 'place5', 'place6', 'place8', 'place9', 'place10',
  'buy4', 'buy5', 'buy6', 'buy8', 'buy9', 'buy10',
  'lay4', 'lay5', 'lay6', 'lay8', 'lay9', 'lay10',
  'field',
  'hard4', 'hard6', 'hard8', 'hard10',
  'any7', 'anyCraps', 'aces', 'boxcars', 'aceDeuce', 'yo',
  'crapsEleven', 'horn', 'hornHigh',
  'big6', 'big8',
  'hopEasy', 'hopHard'
]

export type GamePhase = 'SETUP' | 'COME_OUT' | 'POINT_PHASE' | 'RESOLVING' | 'BETWEEN_ROLLS' | 'SEVEN_OUT' | 'SHOOTER_CHANGE'

export interface DiceRoll {
  die1: number
  die2: number
  total: number
  isHard: boolean
}

export interface ActiveBet {
  id: string
  type: BetType
  owner: string
  amount: number
  oddsAmount: number
  pointNumber: number | null
  isContract: boolean
  isWorking: boolean
  status: 'pending' | 'active' | 'resolved'
  placedOnRoll: number
  resolvedOnRoll: number | null
}

export interface BetResolution {
  betId: string
  betType: BetType
  owner: string
  outcome: 'win' | 'lose' | 'push' | 'point_established'
  payout: number
  netGain: number
  description: string
}

export interface TableRules {
  minBet: number
  maxBet: number
  oddsMultiple: string
  fieldTwelvePayout: 2 | 3
  buyVigTiming: 'on_bet' | 'on_win'
  hardwaysOnComeOut: boolean
  payoutRounding: 'dollar' | 'quarter' | 'exact'
}

export interface PlayerState {
  id: string
  name: string
  bankroll: number
  startingBankroll: number
  isHero: boolean
  isBusted: boolean
  strategy: string | null
  bankrollHistory: number[]
}

export interface BetTypeStats {
  timesPlaced: number
  won: number
  lost: number
  pushed: number
  totalWagered: number
  netProfitLoss: number
}

export interface SessionStats {
  rollsWitnessed: number
  pointsEstablished: number
  pointsMade: number
  pointsMissed: number
  totalWagered: number
  totalProfitLoss: number
  longestShooterRolls: number
  betTypeStats: Record<string, BetTypeStats>
  bankrollHistory: number[]
}

// Maps BetType to SVG zone ID
export const BET_TYPE_TO_ZONE: Record<BetType, string> = {
  pass: 'pass-line',
  dontPass: 'dont-pass',
  passOdds: 'pass-odds',
  dontPassOdds: 'dont-pass-odds',
  come: 'come',
  dontCome: 'dont-come',
  comeOdds: 'come-odds',
  dontComeOdds: 'dont-come-odds',
  place4: 'place-4',
  place5: 'place-5',
  place6: 'place-six',
  place8: 'place-8',
  place9: 'place-nine',
  place10: 'place-10',
  buy4: 'buy-4',
  buy5: 'buy-5',
  buy6: 'buy-6',
  buy8: 'buy-8',
  buy9: 'buy-9',
  buy10: 'buy-10',
  lay4: 'lay-4',
  lay5: 'lay-5',
  lay6: 'lay-6',
  lay8: 'lay-8',
  lay9: 'lay-9',
  lay10: 'lay-10',
  field: 'field',
  hard4: 'hard-4',
  hard6: 'hard-6',
  hard8: 'hard-8',
  hard10: 'hard-10',
  any7: 'any-seven',
  anyCraps: 'any-craps',
  aces: 'aces',
  boxcars: 'boxcars',
  aceDeuce: 'ace-deuce',
  yo: 'yo-eleven',
  crapsEleven: 'craps-eleven',
  horn: 'horn',
  hornHigh: 'horn-high',
  big6: 'big-6',
  big8: 'big-8',
  hopEasy: 'hop-easy',
  hopHard: 'hop-hard'
}

// Bet categories for UI and resolution
export const ONE_ROLL_BETS: BetType[] = [
  'field', 'any7', 'anyCraps', 'aces', 'boxcars', 'aceDeuce', 'yo',
  'crapsEleven', 'horn', 'hornHigh', 'hopEasy', 'hopHard'
]

export const CONTRACT_BETS: BetType[] = ['pass', 'come']

export const POINT_NUMBERS = [4, 5, 6, 8, 9, 10] as const

export function betTypeToNumber(type: BetType): number | null {
  const match = type.match(/\d+/)
  return match ? parseInt(match[0]) : null
}

export function isPlaceBet(type: BetType): boolean {
  return type.startsWith('place')
}

export function isBuyBet(type: BetType): boolean {
  return type.startsWith('buy')
}

export function isLayBet(type: BetType): boolean {
  return type.startsWith('lay')
}

export function isHardwayBet(type: BetType): boolean {
  return type.startsWith('hard')
}

export function isOddsBet(type: BetType): boolean {
  return type.endsWith('Odds')
}

let nextBetId = 1
export function generateBetId(): string {
  return `bet-${nextBetId++}`
}

export function resetBetIdCounter(): void {
  nextBetId = 1
}

/** After restoring persisted bets, advance the counter past every restored id. */
export function syncBetIdCounter(existingIds: string[]): void {
  let max = 0
  for (const id of existingIds) {
    const m = id.match(/^bet-(\d+)$/)
    if (m) max = Math.max(max, parseInt(m[1]!))
  }
  nextBetId = Math.max(nextBetId, max + 1)
}
