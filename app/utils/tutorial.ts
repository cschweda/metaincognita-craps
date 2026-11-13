import type { BetType, GamePhase, TableRules } from './betTypes'
import { formatCents } from './format'
import { getMaxOdds } from '../engine/payouts'

/**
 * The guided tutorial: one scripted round of craps.
 *
 * The dice are pre-arranged so a newcomer meets each situation exactly once,
 * in an order that builds — a natural, a craps, a point, odds, a come bet, a
 * place bet, a one-roll bet, a point made, and finally a seven-out. Every
 * roll still goes through the real engine; only the dice are fixed.
 */

export type TutorialTask
  /** Read, then press Continue. */
  = | { kind: 'next' }
  /** Put the selected chip on one specific spot. */
    | { kind: 'bet', betType: BetType, zone: string }
  /** Take odds behind the Pass Line with the odds button. */
    | { kind: 'odds' }
  /** Throw the (pre-arranged) dice. `after` is the state the roll must leave. */
    | { kind: 'roll', dice: [number, number], after: { phase: GamePhase, point: number | null } }

export interface TutorialStep {
  id: string
  title: string
  /** Paragraphs. `{min}`, `{odds}`, `{oddsWin}`, `{placeWin}` are filled from the table rules. */
  body: string[]
  /** The one thing to do now (shown as the call to action). */
  action: string
  task: TutorialTask
  /** Show what the last roll paid or cost under the text. */
  showResults?: boolean
}

/** The tutorial always runs at this table, so its numbers are predictable. */
export const TUTORIAL_STAKE_LEVEL = 2
export const TUTORIAL_BANKROLL = 50000

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to the table',
    body: [
      'Craps looks complicated because the layout offers dozens of bets. You only need a handful of them, and most of the table can be ignored.',
      'This walkthrough plays one complete round with you. The dice are pre-arranged so you see each situation once. Each step tells you the one thing to do — the spot to click glows on the table.'
    ],
    action: 'Press Continue to begin.',
    task: { kind: 'next' }
  },
  {
    id: 'pass-1',
    title: 'The Pass Line',
    body: [
      'Almost everyone starts here. A Pass Line bet is a bet WITH the shooter — the player throwing the dice, which right now is you.',
      'It pays even money: bet {min}, win {min}.'
    ],
    action: 'Click the glowing PASS LINE to bet {min}.',
    task: { kind: 'bet', betType: 'pass', zone: 'pass-line' }
  },
  {
    id: 'roll-natural',
    title: 'The come-out roll',
    body: [
      'The first roll of a round is called the come-out roll. Three things can happen:',
      '7 or 11 — the Pass Line wins at once.  2, 3 or 12 — it loses at once.  Anything else (4, 5, 6, 8, 9, 10) — that number becomes "the point" and the round continues.'
    ],
    action: 'Press Shoot to roll the dice.',
    task: { kind: 'roll', dice: [4, 3], after: { phase: 'COME_OUT', point: null } }
  },
  {
    id: 'natural',
    title: 'Seven — a winner',
    body: [
      'A 7 on the come-out is called a "natural". Your Pass Line bet won even money, and the bet came back to you with the winnings.',
      'Nothing carries over: the next roll is a brand-new come-out, so you need a new bet.'
    ],
    action: 'Press Continue.',
    task: { kind: 'next' },
    showResults: true
  },
  {
    id: 'pass-2',
    title: 'Bet again',
    body: ['You must have a line bet down before you can shoot a come-out roll.'],
    action: 'Click the PASS LINE again.',
    task: { kind: 'bet', betType: 'pass', zone: 'pass-line' }
  },
  {
    id: 'roll-craps',
    title: 'Another come-out',
    body: ['Same rules as before: 7 or 11 wins, 2, 3 or 12 loses, anything else sets the point.'],
    action: 'Press Shoot.',
    task: { kind: 'roll', dice: [1, 1], after: { phase: 'COME_OUT', point: null } }
  },
  {
    id: 'craps',
    title: 'Two — "craps"',
    body: [
      'A 2, 3 or 12 on the come-out is called "craps" and the Pass Line loses. That is where the game gets its name.',
      'You keep the dice, though. A shooter only gives them up after a "seven-out", which you will see at the end.'
    ],
    action: 'Press Continue.',
    task: { kind: 'next' },
    showResults: true
  },
  {
    id: 'pass-3',
    title: 'Third time',
    body: ['One more Pass Line bet. This time the roll will set a point.'],
    action: 'Click the PASS LINE.',
    task: { kind: 'bet', betType: 'pass', zone: 'pass-line' }
  },
  {
    id: 'roll-point',
    title: 'Setting a point',
    body: ['Watch the black OFF puck at the top of the table when the dice land.'],
    action: 'Press Shoot.',
    task: { kind: 'roll', dice: [4, 2], after: { phase: 'POINT_PHASE', point: 6 } }
  },
  {
    id: 'point',
    title: 'The point is 6',
    body: [
      'The puck flipped to ON and moved to the 6. Your Pass Line bet is now locked in until the round ends, and only two numbers matter to it: a 6 wins, a 7 loses. Every other roll does nothing to it.',
      'There are 5 ways to roll a 6 and 6 ways to roll a 7, so you are a slight underdog from here. That small gap, together with the come-out rules, is the entire 1.41% house edge.'
    ],
    action: 'Press Continue.',
    task: { kind: 'next' }
  },
  {
    id: 'odds',
    title: 'Odds: the best bet in the casino',
    body: [
      'Once a point is set you may back your Pass Line bet with "odds". Odds are paid at the true mathematical odds — 6 to 5 on a 6 — so the casino has NO edge on that money. It is the only bet in the building like that, which is why the layout does not even label it.',
      'This table lets you take 5 times your line bet on a 6: {odds}, to win {oddsWin}.'
    ],
    action: 'Press the green Max Odds button below the table.',
    task: { kind: 'odds' }
  },
  {
    id: 'roll-nothing',
    title: 'Roll for the point',
    body: ['You now have {min} on the line and {odds} in odds behind it. You want a 6 before a 7.'],
    action: 'Press Shoot.',
    task: { kind: 'roll', dice: [3, 2], after: { phase: 'POINT_PHASE', point: 6 } }
  },
  {
    id: 'nothing',
    title: 'Five — nothing happens',
    body: [
      'Not a 6, not a 7. Your Pass Line and odds just sit there. Most rolls in a round are like this, which is why players add other bets while they wait.'
    ],
    action: 'Press Continue.',
    task: { kind: 'next' }
  },
  {
    id: 'come',
    title: 'The Come bet',
    body: [
      'A Come bet is simply a second Pass Line bet that you can make in the middle of a round. Its own "come-out" is the very next roll: 7 or 11 wins, 2, 3 or 12 loses, and any other number becomes that bet\'s own point.',
      'Same 1.41% edge as the Pass Line.'
    ],
    action: 'Click the glowing COME area.',
    task: { kind: 'bet', betType: 'come', zone: 'come' }
  },
  {
    id: 'roll-come',
    title: 'Where will it go?',
    body: ['Watch your Come chip when the dice land.'],
    action: 'Press Shoot.',
    task: { kind: 'roll', dice: [5, 4], after: { phase: 'POINT_PHASE', point: 6 } }
  },
  {
    id: 'come-point',
    title: 'Nine — your Come bet travelled',
    body: [
      'The chip moved up into the 9 box. That Come bet now wins if a 9 rolls before a 7. It has nothing to do with the table\'s point of 6 — you have two numbers working for you.',
      'A 7 would now lose both. More bets mean more ways to win and more to lose at once.'
    ],
    action: 'Press Continue.',
    task: { kind: 'next' }
  },
  {
    id: 'place',
    title: 'A Place bet',
    body: [
      'You do not have to wait for the dice to choose your number. A Place bet goes straight onto a number box: it wins every time that number rolls and loses on a 7.',
      'Place 6 and Place 8 pay 7 to 6 and carry a 1.52% edge — nearly as good as the line.'
    ],
    action: 'Click the glowing 8 box.',
    task: { kind: 'bet', betType: 'place8', zone: 'place-8' }
  },
  {
    id: 'roll-place',
    title: 'Roll again',
    body: ['You now want a 6, an 8 or a 9. Only a 7 hurts.'],
    action: 'Press Shoot.',
    task: { kind: 'roll', dice: [4, 4], after: { phase: 'POINT_PHASE', point: 6 } }
  },
  {
    id: 'place-win',
    title: 'Eight — the Place bet pays',
    body: [
      'Your Place 8 won {placeWin} — and notice the bet is still on the table. Place bets are paid and left up; they keep winning every time the number repeats, until a 7 or until you take them down.',
      'Tip: 7 to 6 only pays in full on multiples of $6. A real player bets $6 or $12 on the 6 and 8 so nothing is lost to rounding.'
    ],
    action: 'Press Continue.',
    task: { kind: 'next' },
    showResults: true
  },
  {
    id: 'field',
    title: 'A one-roll bet: the Field',
    body: [
      'Some bets live for a single roll. The Field wins if the very next roll is 2, 3, 4, 9, 10, 11 or 12 and loses on 5, 6, 7 or 8 — then it is over either way.',
      'It looks generous (seven numbers!) but the losing numbers roll more often. Edge: 2.78%.'
    ],
    action: 'Click the glowing FIELD.',
    task: { kind: 'bet', betType: 'field', zone: 'field' }
  },
  {
    id: 'roll-field',
    title: 'One roll decides it',
    body: ['Win or lose, the Field bet is settled by this roll.'],
    action: 'Press Shoot.',
    task: { kind: 'roll', dice: [2, 1], after: { phase: 'POINT_PHASE', point: 6 } }
  },
  {
    id: 'field-win',
    title: 'Three — the Field wins',
    body: [
      'Paid even money and handed back. Your other bets did not care about a 3.',
      'The right-hand side of the table is full of one-roll bets like this — Any 7, Horn, Hardways, Yo. They pay big because they rarely hit, and they carry edges of 9% to almost 17%. Regulars call them sucker bets.'
    ],
    action: 'Press Continue.',
    task: { kind: 'next' },
    showResults: true
  },
  {
    id: 'roll-made',
    title: 'Back to the point',
    body: ['Your Pass Line and odds are still waiting on a 6.'],
    action: 'Press Shoot.',
    task: { kind: 'roll', dice: [3, 3], after: { phase: 'COME_OUT', point: null } }
  },
  {
    id: 'made',
    title: 'Six — you made the point!',
    body: [
      'The Pass Line paid even money and your odds paid 6 to 5: {odds} won {oddsWin}. That is the hand every shooter is after.',
      'The round is over and the puck is OFF, but look at the table: your Come bet on 9 and your Place 8 are still there. During a come-out roll, Place bets are switched OFF (no action) while Come bets keep working.'
    ],
    action: 'Press Continue.',
    task: { kind: 'next' },
    showResults: true
  },
  {
    id: 'pass-4',
    title: 'A new round',
    body: ['You made your point, so you keep the dice. New come-out, new Pass Line bet.'],
    action: 'Click the PASS LINE.',
    task: { kind: 'bet', betType: 'pass', zone: 'pass-line' }
  },
  {
    id: 'roll-point-2',
    title: 'Come-out roll',
    body: ['This roll will set a new point.'],
    action: 'Press Shoot.',
    task: { kind: 'roll', dice: [5, 5], after: { phase: 'POINT_PHASE', point: 10 } }
  },
  {
    id: 'roll-seven-out',
    title: 'The point is 10',
    body: [
      'The puck is ON the 10 and your Place 8 is working again. You have three numbers up: 10, 9 and 8.',
      'Now for the roll every shooter dreads.'
    ],
    action: 'Press Shoot.',
    task: { kind: 'roll', dice: [3, 4], after: { phase: 'COME_OUT', point: null } }
  },
  {
    id: 'seven-out',
    title: 'Seven out',
    body: [
      'A 7 with a point on ends the round and sweeps the table: the Pass Line, the Come bet on 9 and the Place 8 all lost together. On a come-out roll that same 7 would have been a winner — everything in craps depends on whether the puck is ON or OFF.',
      'A seven-out also ends the shooter\'s turn. The dice pass to the next player at the table.'
    ],
    action: 'Press Continue.',
    task: { kind: 'next' },
    showResults: true
  },
  {
    id: 'finish',
    title: 'That is the whole game',
    body: [
      'Best bets: Pass Line or Come, always backed with odds (1.41% or less). Good: Place 6 and Place 8 (1.52%). Avoid: everything in the centre of the table.',
      'From here the dice are random and the table is yours. Three things help while you learn: the Advisor tab explains every roll and suggests your next move, Study mode describes any spot you hover over, and the Players tab shows how other betting systems fare over time.'
    ],
    action: 'Press Start playing.',
    task: { kind: 'next' }
  }
]

/** Fill the `{placeholders}` in tutorial text from the table rules. */
export function fillTutorialText(text: string, rules: TableRules): string {
  const odds = getMaxOdds(rules.minBet, 6, rules.oddsMultiple)
  const values: Record<string, number> = {
    min: rules.minBet,
    odds,
    // Odds on a 6 pay 6:5
    oddsWin: Math.floor(odds * 6 / 5),
    // Place 8 pays 7:6, rounded down to the table's chip size
    placeWin: Math.floor(Math.floor(rules.minBet * 7 / 6) / 100) * 100
  }
  return text.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? formatCents(values[key]!) : whole
  )
}
