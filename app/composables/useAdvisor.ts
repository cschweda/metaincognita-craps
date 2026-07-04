import type { GamePhase, BetType } from '~/utils/betTypes'
import { crapsConfig } from '~~/craps.config'
import { formatCents } from '~/utils/format'

export interface Recommendation {
  /** Bold headline: what happened or what to do */
  action: string
  /** Where on the board to click (highlighted separately) — null if no board action */
  where: string | null
  /** Paragraphs of explanation (each string = one paragraph) */
  detail: string[]
  betType: BetType | null
  priority: 'strong' | 'good' | 'info' | 'warning' | 'result-win' | 'result-lose' | 'result-push' | 'result-point'
  houseEdge?: number
}

const WAYS: Record<number, number> = { 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3 }
const ODDS_PAYOUTS: Record<number, string> = { 4: '2 to 1', 5: '3 to 2', 6: '6 to 5', 8: '6 to 5', 9: '3 to 2', 10: '2 to 1' }
const ODDS_MULTIPLES: Record<string, Record<number, number>> = crapsConfig.oddsMultiples

function fc(cents: number): string {
  return formatCents(cents)
}

export function useAdvisor() {
  const store = useCrapsStore()

  function getRecommendations(): Recommendation[] {
    const recs: Recommendation[] = []
    const phase = store.phase as GamePhase
    const point = store.point
    const heroBets = store.activeBets.filter(b => b.owner === 'hero' && b.status !== 'resolved')
    const hero = store.hero
    if (!hero) return recs

    const min = store.tableRules.minBet
    const hasPass = heroBets.some(b => b.type === 'pass')
    const hasDontPass = heroBets.some(b => b.type === 'dontPass')
    const passBet = heroBets.find(b => b.type === 'pass')
    const dontPassBet = heroBets.find(b => b.type === 'dontPass')
    const hasPassOdds = heroBets.some(b => b.type === 'passOdds')
    const hasDontPassOdds = heroBets.some(b => b.type === 'dontPassOdds')
    const comeCount = heroBets.filter(b => b.type === 'come' && b.pointNumber !== null).length
    const pendingCome = heroBets.some(b => b.type === 'come' && b.pointNumber === null)
    const roll = store.currentRoll
    const lastRes = store.lastResolutions.filter(r => r.owner === 'hero')

    // ──────────────────────────────────────────────
    // SECTION 1: What just happened
    // ──────────────────────────────────────────────
    if (roll && lastRes.length > 0) {
      const netResult = lastRes.reduce((s, r) => s + r.netGain, 0)

      if (netResult > 0) {
        recs.push({
          action: `You won ${fc(netResult)}!`,
          where: null,
          betType: null,
          detail: buildResultParagraphs(lastRes, roll, phase, point),
          priority: 'result-win'
        })
      } else if (netResult < 0) {
        recs.push({
          action: `You lost ${fc(Math.abs(netResult))}`,
          where: null,
          betType: null,
          detail: buildResultParagraphs(lastRes, roll, phase, point),
          priority: 'result-lose'
        })
      } else if (lastRes.some(r => r.outcome === 'push')) {
        recs.push({
          action: 'Push — your bet is returned',
          where: null,
          betType: null,
          detail: buildResultParagraphs(lastRes, roll, phase, point),
          priority: 'result-push'
        })
      }

      // Individual bet breakdowns if multiple
      if (lastRes.length > 1) {
        for (const res of lastRes) {
          const sign = res.netGain >= 0 ? '+' : ''
          recs.push({
            action: `${res.description} (${sign}${fc(res.netGain)})`,
            where: null,
            betType: null,
            detail: [],
            priority: res.outcome === 'win' ? 'result-win' : res.outcome === 'push' ? 'result-push' : 'result-lose'
          })
        }
      }
    }

    // Point just established
    if (roll && phase === 'POINT_PHASE' && point && store.shooterRollCount <= 1) {
      const ways = WAYS[point] ?? 0
      const prob = ((ways / (ways + 6)) * 100).toFixed(1)
      recs.push({
        action: `The point is now ${point}`,
        where: null,
        betType: null,
        detail: [
          `The dealer moved the ON puck to ${point}. The game has entered the "point phase."`,
          `Your goal: roll ${point} again before rolling a 7.`,
          `The math: there are ${ways} dice combinations that make ${point}, but 6 combinations that make 7. That gives you a ${prob}% chance of hitting the point.`,
          `On average, it takes about ${(36 / (ways + 6)).toFixed(1)} rolls to resolve — either you hit ${point} and win, or you roll a 7 ("seven-out") and lose.`
        ],
        priority: 'result-point'
      })
    }

    // ──────────────────────────────────────────────
    // SECTION 2: What to do next
    // ──────────────────────────────────────────────

    if (phase === 'COME_OUT') {
      if (!hasPass && !hasDontPass) {
        recs.push({
          action: 'Place a bet on the Pass Line',
          where: `Click the large "PASS LINE" area at the bottom of the table to bet ${fc(min)}.`,
          betType: 'pass',
          detail: [
            'The Pass Line is the most common bet in craps. You\'re betting WITH the shooter — when the shooter wins, you win.',
            `On this "come-out" roll, three things can happen:`,
            `7 or 11 = You WIN immediately! You get your ${fc(min)} bet back plus ${fc(min)} in winnings.`,
            `2, 3, or 12 = You LOSE your ${fc(min)} bet. (This is called "craps.")`,
            `Any other number (4, 5, 6, 8, 9, 10) = That number becomes "the point." The game continues and you need the shooter to roll that number again before rolling a 7.`,
            `The house edge is just 1.41% — meaning the casino keeps about $1.41 for every $100 you bet over time. This is one of the best bets in any casino.`
          ],
          priority: 'strong',
          houseEdge: 0.01414
        })
        recs.push({
          action: 'Or bet on Don\'t Pass (the opposite)',
          where: `Click the "DON'T PASS BAR" area just above the Pass Line to bet ${fc(min)}.`,
          betType: 'dontPass',
          detail: [
            'Don\'t Pass is the opposite of the Pass Line — you\'re betting AGAINST the shooter.',
            `Come-out roll of 2 or 3 = You WIN even money.`,
            `Come-out roll of 12 = Push (tie) — your bet is returned. The casino "bars" 12 to keep a small edge.`,
            `Come-out roll of 7 or 11 = You LOSE.`,
            `If a point is set, you WIN when a 7 rolls before the point.`,
            `Slightly better math (1.36% edge) but socially unpopular at a real table — you're cheering when everyone else groans. This is called "playing the dark side."`
          ],
          priority: 'good',
          houseEdge: 0.01364
        })
      } else {
        recs.push({
          action: 'Ready to roll!',
          where: 'Click the green "Roll Dice" button below the table.',
          betType: null,
          detail: hasPass
            ? [
                `You have ${fc(passBet!.amount)} on the Pass Line. Here's what can happen:`,
                `7 or 11 → WIN ${fc(passBet!.amount)} instantly! (Probability: 22.2%)`,
                `2, 3, or 12 → LOSE ${fc(passBet!.amount)}. (Probability: 11.1%)`,
                `4, 5, 6, 8, 9, or 10 → That number becomes the "point." Game continues. (Probability: 66.7%)`
              ]
            : [
                `You have ${fc(dontPassBet!.amount)} on Don't Pass. Here's what can happen:`,
                `2 or 3 → WIN ${fc(dontPassBet!.amount)}! (Probability: 8.3%)`,
                `12 → Push — bet returned. (Probability: 2.8%)`,
                `7 or 11 → LOSE ${fc(dontPassBet!.amount)}. (Probability: 22.2%)`,
                `4, 5, 6, 8, 9, or 10 → Point is set. You want 7 before the point. (Probability: 66.7%)`
              ],
          priority: 'info'
        })
      }
    }

    if (phase === 'POINT_PHASE' && point) {
      const ways = WAYS[point] ?? 0
      const prob = ((ways / (ways + 6)) * 100).toFixed(1)
      const expectedRolls = (36 / (ways + 6)).toFixed(1)
      const oddsMultiple = store.tableRules.oddsMultiple
      const multiplesMap = ODDS_MULTIPLES[oddsMultiple]
      const maxMultiple = multiplesMap?.[point] ?? 1
      const oddsPayStr = ODDS_PAYOUTS[point] ?? '?'

      // Recommend odds
      if (hasPass && !hasPassOdds && passBet) {
        const maxOdds = passBet.amount * maxMultiple
        recs.push({
          action: 'Take Odds behind your Pass Line bet',
          where: `Click the dashed "ODDS" area just above your Pass Line chip, or click the "Max Odds" button in the control bar to place ${fc(maxOdds)}.`,
          betType: 'passOdds',
          detail: [
            `This is the single most important thing to learn in craps: the Odds bet.`,
            `What it is: An extra bet you can place behind your Pass Line bet after a point is established. It pays at "true odds" — the mathematically fair rate — with ZERO house edge. The casino makes nothing on this bet.`,
            `How much: This table allows ${oddsMultiple} odds. On point ${point}, you can bet up to ${maxMultiple}× your Pass bet = ${fc(maxOdds)}.`,
            `What it pays: If ${point} hits before 7, your odds bet pays ${oddsPayStr}. So ${fc(maxOdds)} in odds wins ${fc(Math.floor(maxOdds * (ways / 6)))}.`,
            `Why it matters: Your Pass Line bet has a 1.41% edge. Every dollar you move to Odds has a 0% edge. Maxing your odds dilutes the overall house advantage to about 0.37%. Always take the maximum odds the table allows.`
          ],
          priority: 'strong',
          houseEdge: 0.0
        })
      }

      if (hasDontPass && !hasDontPassOdds && dontPassBet) {
        recs.push({
          action: 'Lay Odds behind your Don\'t Pass bet',
          where: `Click the "LAY ODDS" area near your Don't Pass chip, or click the "Lay Odds" button in the control bar.`,
          betType: 'dontPassOdds',
          detail: [
            `Lay odds work like Pass odds but in reverse — you're betting MORE to win LESS, because 7 is more likely than the point.`,
            `Like Pass odds, lay odds pay at true mathematical odds with 0% house edge. The casino makes nothing on this bet.`,
            `You have a ${(100 - parseFloat(prob)).toFixed(1)}% chance of winning (7 before ${point}). This is the mathematically optimal play.`
          ],
          priority: 'strong',
          houseEdge: 0.0
        })
      }

      // Come bet suggestion
      if ((hasPass || hasDontPass) && (hasPassOdds || hasDontPassOdds) && comeCount < 2 && !pendingCome) {
        recs.push({
          action: 'Place a Come bet for more action',
          where: `Click the large "COME" area in the center of the table to bet ${fc(min)}.`,
          betType: 'come',
          detail: [
            `A Come bet works exactly like a new Pass Line bet, but you can place it during the point phase.`,
            `On the next roll: 7 or 11 = your Come bet wins. 2/3/12 = it loses. Any other number becomes YOUR "come point" — the chip moves to that number box, and you need that number before 7.`,
            `Once your Come point is established, you can (and should!) take odds behind it — same 0% edge as Pass odds.`,
            `Having 2-3 numbers working with odds is called the "Three Point Molly" — a textbook grinding strategy. You currently have ${comeCount} come bet${comeCount !== 1 ? 's' : ''}, so adding ${comeCount === 0 ? '1-2 more' : '1 more'} gives you more ways to win on each roll.`
          ],
          priority: 'good',
          houseEdge: 0.01414
        })
      }

      // Point status if no other action items
      if (recs.filter(r => !r.priority.startsWith('result')).length === 0) {
        recs.push({
          action: `Point is ${point} — roll the dice`,
          where: 'Click "Roll Dice" to continue.',
          betType: null,
          detail: [
            `You're trying to roll ${point} before 7.`,
            `${ways} ways to make ${point} vs 6 ways to roll 7 = ${prob}% chance per roll.`,
            `Expected to resolve in ~${expectedRolls} rolls.`,
            hasPassOdds ? 'You have odds working behind your line bet. Good strategy.' : 'Tip: You should take odds behind your line bet to reduce the house edge.'
          ],
          priority: 'info'
        })
      }
    }

    // ──────────────────────────────────────────────
    // SECTION 3: Warnings about bad bets
    // ──────────────────────────────────────────────
    for (const bet of heroBets) {
      if (bet.type === 'any7') {
        recs.push({
          action: 'Remove your Any 7 bet',
          where: null,
          betType: null,
          detail: [
            `Any 7 has a 16.67% house edge — the worst bet on the entire table. The casino keeps $16.67 out of every $100 wagered.`,
            `Yes, 7 is the most common roll (6 out of 36 outcomes). But the payout is only 4 to 1, when the true odds are 5 to 1. That gap is where the house makes its money.`,
            `Compare: Pass Line costs $1.41 per $100. Any 7 costs $16.67 per $100. That's almost 12 times worse.`
          ],
          priority: 'warning',
          houseEdge: 0.16667
        })
      }
      if (bet.type === 'big6' || bet.type === 'big8') {
        const num = bet.type === 'big6' ? 6 : 8
        recs.push({
          action: `Switch your Big ${num} to a Place ${num} bet`,
          where: `Remove your Big ${num} chip and click the "${num === 6 ? 'SIX' : '8'}" number box at the top of the table instead.`,
          betType: null,
          detail: [
            `Big ${num} and Place ${num} are the exact same bet: "${num} rolls before 7."`,
            `But Big ${num} only pays even money (1:1), while Place ${num} pays 7 to 6. On a ${fc(600)} bet, Place ${num} pays ${fc(700)} but Big ${num} only pays ${fc(600)}.`,
            `The house edge on Big ${num} is 9.09%. Place ${num} is just 1.52%. You're giving the house 6× more for no reason. Never bet Big 6 or Big 8.`
          ],
          priority: 'warning',
          houseEdge: 0.09091
        })
      }
      if (bet.type === 'hard4' || bet.type === 'hard10') {
        const num = bet.type === 'hard4' ? 4 : 10
        recs.push({
          action: `Hardway ${num}: high house edge (11.11%)`,
          where: null,
          betType: null,
          detail: [
            `A "hard" ${num} means both dice show ${num / 2} (${num / 2}+${num / 2}). You win if that exact combo rolls before a 7 or an "easy" ${num}.`,
            `There's only 1 way to win, but ${num === 4 ? 8 : 8} ways to lose (6 ways to roll 7, plus ${num === 4 ? 2 : 2} ways to make ${num} the easy way). Pays 7:1 but true odds are 8:1.`,
            `The house takes $11.11 per $100 wagered. Fun to hit, but terrible math.`
          ],
          priority: 'warning',
          houseEdge: 0.11111
        })
      }
      if (bet.type === 'hard6' || bet.type === 'hard8') {
        const num = bet.type === 'hard6' ? 6 : 8
        recs.push({
          action: `Hardway ${num}: high house edge (9.09%)`,
          where: null,
          betType: null,
          detail: [
            `Hard ${num} means ${num / 2}+${num / 2}. Only 1 way to win vs 10 ways to lose.`,
            `Pays 9:1 but true odds are 10:1. The house keeps $9.09 per $100 wagered.`,
            `If you want action on ${num}, a Place ${num} bet costs only $1.52 per $100 — that's 6× cheaper.`
          ],
          priority: 'warning',
          houseEdge: 0.09091
        })
      }
      if ((bet.type === 'place6' || bet.type === 'place8') && bet.amount % 600 !== 0) {
        recs.push({
          action: 'Bet sizing tip: Place 6/8 in multiples of $6',
          where: null,
          betType: null,
          detail: [
            `Place 6 and Place 8 pay 7 to 6. Your ${fc(bet.amount)} bet doesn't divide cleanly, so the casino rounds down — you lose money to rounding.`,
            `Bet ${fc(600)}, ${fc(1200)}, or ${fc(1800)} for clean payouts (${fc(700)}, ${fc(1400)}, ${fc(2100)}).`
          ],
          priority: 'warning'
        })
      }
      if ((bet.type === 'place5' || bet.type === 'place9') && bet.amount % 500 !== 0) {
        recs.push({
          action: 'Bet sizing tip: Place 5/9 in multiples of $5',
          where: null,
          betType: null,
          detail: [
            `Place 5 and 9 pay 7 to 5. Bet in multiples of ${fc(500)} for clean payouts.`
          ],
          priority: 'warning'
        })
      }
      if (bet.type.startsWith('buy') && store.tableRules.buyVigTiming === 'on_win') {
        const num = parseInt(bet.type.replace('buy', ''))
        if (num === 4 || num === 10) {
          recs.push({
            action: `Good bet: Buy ${num} with vig on win`,
            where: null,
            betType: null,
            detail: [
              `Buy ${num} pays true odds (2:1) with a 5% commission charged only when you win. That's just a 1.67% house edge.`,
              `Compare to Place ${num} at 6.67% — the Buy bet is 4× cheaper. Smart play.`
            ],
            priority: 'info',
            houseEdge: 0.01667
          })
        }
      }
    }

    // ──────────────────────────────────────────────
    // SECTION 4: All available bets ranked best → worst
    // ──────────────────────────────────────────────
    const alreadyMentioned = new Set(recs.filter(r => r.betType).map(r => r.betType))

    interface AvailableBet {
      name: string
      type: BetType
      where: string
      edge: number
      pays: string
      note: string
      rating: 'best' | 'good' | 'ok' | 'bad' | 'terrible'
    }

    const available: AvailableBet[] = []

    if (phase === 'COME_OUT') {
      if (!hasPass && !alreadyMentioned.has('pass')) {
        available.push({ name: 'Pass Line', type: 'pass', where: 'Bottom of table — "PASS LINE"', edge: 1.41, pays: '1:1 (even money)', note: 'Best starting bet. Bet with the shooter.', rating: 'best' })
      }
      if (!hasDontPass && !alreadyMentioned.has('dontPass')) {
        available.push({ name: 'Don\'t Pass', type: 'dontPass', where: '"DON\'T PASS BAR" above Pass Line', edge: 1.36, pays: '1:1 (even money)', note: 'Slightly better math, bet against shooter.', rating: 'best' })
      }
      available.push({ name: 'Field', type: 'field', where: '"FIELD" area in the middle', edge: store.tableRules.fieldTwelvePayout === 3 ? 2.78 : 5.56, pays: '1:1 (2:1 on 2, 3:1 on 12)', note: 'One-roll bet. Wins on 2/3/4/9/10/11/12, loses on 5/6/7/8.', rating: 'ok' })
    }

    if (phase === 'POINT_PHASE' && point) {
      if (!alreadyMentioned.has('passOdds') && hasPass && !hasPassOdds) {
        // already covered above
      }
      if (!alreadyMentioned.has('come') && !pendingCome) {
        available.push({ name: 'Come', type: 'come', where: '"COME" area in center of table', edge: 1.41, pays: '1:1', note: 'Works like a new Pass Line bet. Establish your own point.', rating: 'best' })
      }
      if (!heroBets.some(b => b.type === 'dontCome')) {
        available.push({ name: 'Don\'t Come', type: 'dontCome', where: '"DON\'T COME BAR" above Come', edge: 1.36, pays: '1:1', note: 'Like a new Don\'t Pass. Bet against the next number.', rating: 'best' })
      }
      // Place bets
      for (const num of [6, 8] as const) {
        const placeType = `place${num}` as BetType
        if (!heroBets.some(b => b.type === placeType)) {
          available.push({ name: `Place ${num}`, type: placeType, where: `"${num === 6 ? 'SIX' : '8'}" number box at top of table`, edge: 1.52, pays: '7:6', note: `Bet ${num} rolls before 7. Bet in multiples of $6.`, rating: 'good' })
        }
      }
      for (const num of [5, 9] as const) {
        const placeType = `place${num}` as BetType
        if (!heroBets.some(b => b.type === placeType)) {
          available.push({ name: `Place ${num}`, type: placeType, where: `"${num}" number box at top of table`, edge: 4.0, pays: '7:5', note: `Bet ${num} rolls before 7. Decent but higher edge than 6/8.`, rating: 'ok' })
        }
      }
      for (const num of [4, 10] as const) {
        const buyType = `buy${num}` as BetType
        const placeType = `place${num}` as BetType
        if (!heroBets.some(b => b.type === buyType || b.type === placeType)) {
          if (store.tableRules.buyVigTiming === 'on_win') {
            available.push({ name: `Buy ${num}`, type: buyType, where: `"${num}" number box (Buy bet)`, edge: 1.67, pays: '2:1 minus 5% vig on win', note: `Much better than Place ${num} (6.67%). Always Buy, never Place, on 4 and 10.`, rating: 'good' })
          } else {
            available.push({ name: `Place ${num}`, type: placeType, where: `"${num}" number box at top of table`, edge: 6.67, pays: '9:5', note: 'High edge. Consider a Buy bet if vig-on-win is available.', rating: 'bad' })
          }
        }
      }
      // Field
      available.push({ name: 'Field', type: 'field', where: '"FIELD" area in the middle', edge: store.tableRules.fieldTwelvePayout === 3 ? 2.78 : 5.56, pays: '1:1 (2:1 on 2, 3:1 on 12)', note: 'One-roll bet. Resolves every single roll.', rating: 'ok' })
      // Hardways
      if (!heroBets.some(b => b.type === 'hard6')) {
        available.push({ name: 'Hard 6', type: 'hard6', where: '"HARD 6" in center props section', edge: 9.09, pays: '9:1', note: 'Wins only if 3+3 rolls before 7 or easy 6. Fun but expensive.', rating: 'bad' })
      }
      if (!heroBets.some(b => b.type === 'hard8')) {
        available.push({ name: 'Hard 8', type: 'hard8', where: '"HARD 8" in center props section', edge: 9.09, pays: '9:1', note: 'Wins only if 4+4 rolls before 7 or easy 8.', rating: 'bad' })
      }
      // Props
      available.push({ name: 'Any Craps', type: 'anyCraps', where: '"ANY CRAPS" in center section', edge: 11.11, pays: '7:1', note: 'One-roll. Wins on 2, 3, or 12. High edge.', rating: 'terrible' })
      available.push({ name: 'Yo (Eleven)', type: 'yo', where: '"YO" in center section', edge: 11.11, pays: '15:1', note: 'One-roll. Wins only on 11.', rating: 'terrible' })
      available.push({ name: 'Any 7', type: 'any7', where: '"ANY SEVEN" in center section', edge: 16.67, pays: '4:1', note: 'Worst bet on the table. Never bet this.', rating: 'terrible' })
    }

    // Only show if we have available bets to list
    if (available.length > 0) {
      // Sort by edge (best first)
      available.sort((a, b) => a.edge - b.edge)

      const lines: string[] = []
      for (const bet of available) {
        const icon = bet.rating === 'best' ? '★' : bet.rating === 'good' ? '✓' : bet.rating === 'ok' ? '·' : bet.rating === 'bad' ? '⚠' : '✗'
        const ratingLabel = bet.rating === 'best' ? 'BEST' : bet.rating === 'good' ? 'GOOD' : bet.rating === 'ok' ? 'OK' : bet.rating === 'bad' ? 'POOR' : 'AVOID'
        lines.push(`${icon} ${bet.name} — ${bet.edge}% edge, pays ${bet.pays} [${ratingLabel}]`)
        lines.push(`   Where: ${bet.where}`)
        lines.push(`   ${bet.note}`)
      }

      recs.push({
        action: 'All available bets (best → worst)',
        where: null,
        betType: null,
        detail: [
          'Here is every bet you can place right now, ranked from lowest house edge (best for you) to highest (worst):',
          ...available.map((bet) => {
            const icon = bet.rating === 'best' ? '★' : bet.rating === 'good' ? '✓' : bet.rating === 'ok' ? '○' : bet.rating === 'bad' ? '⚠' : '✗'
            return `${icon} ${bet.name} — ${bet.edge}% edge, pays ${bet.pays}. ${bet.note} → ${bet.where}`
          })
        ],
        priority: 'info'
      })
    }

    return recs
  }

  function buildResultParagraphs(
    resolutions: typeof store.lastResolutions,
    roll: NonNullable<typeof store.currentRoll>,
    phase: GamePhase,
    point: number | null
  ): string[] {
    const paras: string[] = []
    const hardLabel = roll.isHard && [4, 6, 8, 10].includes(roll.total) ? ' the hard way' : ''
    paras.push(`You rolled ${roll.die1} + ${roll.die2} = ${roll.total}${hardLabel}.`)

    // Come-out explanations
    if (roll.total === 7 && resolutions.some(r => r.betType === 'pass' && r.outcome === 'win')) {
      paras.push('Seven is a "natural" on the come-out roll — your Pass Line bet wins even money! The shooter keeps the dice.')
    }
    if (roll.total === 11 && resolutions.some(r => r.betType === 'pass' && r.outcome === 'win')) {
      paras.push('Eleven ("yo") is also a natural — Pass Line wins even money! Same as rolling a 7 on the come-out.')
    }
    if ([2, 3, 12].includes(roll.total) && resolutions.some(r => r.betType === 'pass' && r.outcome === 'lose')) {
      const name = roll.total === 2 ? 'Snake Eyes' : roll.total === 3 ? 'Ace-Deuce' : 'Boxcars'
      paras.push(`${roll.total} (${name}) is "craps" — Pass Line loses. But you keep the dice! Place a new Pass Line bet to roll again.`)
    }
    if ([2, 3].includes(roll.total) && resolutions.some(r => r.betType === 'dontPass' && r.outcome === 'win')) {
      paras.push(`${roll.total} on the come-out — Don't Pass wins! When the Pass Line loses on craps, the Don't Pass wins.`)
    }
    if (roll.total === 12 && resolutions.some(r => r.betType === 'dontPass' && r.outcome === 'push')) {
      paras.push('12 on come-out is "barred" for Don\'t Pass — your bet pushes (tie). The casino bars 12 so Don\'t Pass doesn\'t have a player advantage.')
    }

    // Seven-out
    if (roll.total === 7 && resolutions.some(r => r.betType === 'pass' && r.outcome === 'lose')) {
      paras.push('Seven-out! Rolling a 7 during the point phase is the worst outcome for Pass Line bettors. Your Pass Line, any Odds, Come bets, and Place bets all lose.')
      paras.push('The dice pass to the next shooter. Place a new line bet for the next come-out roll.')
    }

    // Point hit
    if (point && roll.total === point && resolutions.some(r => r.betType === 'pass' && r.outcome === 'win')) {
      paras.push(`You hit the point! Rolling ${point} before 7 wins your Pass Line bet and any Odds behind it. The puck goes OFF and a new come-out roll begins.`)
    }

    // Field
    if (resolutions.some(r => r.betType === 'field' && r.outcome === 'win')) {
      const fieldMult = roll.total === 2 ? '2 to 1' : roll.total === 12 ? (store.tableRules.fieldTwelvePayout === 3 ? '3 to 1' : '2 to 1') : 'even money'
      paras.push(`Field wins — ${roll.total} is a field number (${fieldMult}).`)
    }
    if (resolutions.some(r => r.betType === 'field' && r.outcome === 'lose')) {
      paras.push(`Field loses — ${roll.total} is not a field number. Field only wins on 2, 3, 4, 9, 10, 11, 12. The numbers 5, 6, 7, 8 are losers.`)
    }

    // Hardway hits
    for (const res of resolutions.filter(r => r.betType.startsWith('hard'))) {
      if (res.outcome === 'win') {
        paras.push(`${res.description}! Both dice showed ${roll.die1} — that's "the hard way." Nice hit.`)
      } else if (res.outcome === 'lose' && roll.total !== 7) {
        paras.push(`${res.description}. The ${roll.total} came "easy" (${roll.die1}+${roll.die2}) — your hardway bet loses because it wasn't a matching pair.`)
      }
    }

    return paras
  }

  function getSessionInsights(): string[] {
    const insights: string[] = []
    const stats = store.sessionStats

    if (stats.rollsWitnessed === 0) return insights

    if (store.shooterRollCount > 0) {
      insights.push(`Current shooter: ${store.shooterRollCount} roll${store.shooterRollCount !== 1 ? 's' : ''}. Average shooter lasts ~8.5 rolls before seven-out.`)
    }

    if (stats.pointsEstablished >= 3) {
      const rate = ((stats.pointsMade / stats.pointsEstablished) * 100).toFixed(0)
      insights.push(`Points made: ${stats.pointsMade} of ${stats.pointsEstablished} (${rate}%). Long-run average is about 40%.`)
    }

    if (stats.totalWagered > 0) {
      const actualEdge = ((Math.abs(stats.totalProfitLoss) / stats.totalWagered) * 100).toFixed(2)
      const direction = stats.totalProfitLoss >= 0 ? 'up' : 'down'
      insights.push(`Session: ${direction} ${fc(Math.abs(stats.totalProfitLoss))} on ${fc(stats.totalWagered)} wagered (${actualEdge}% actual edge).`)
    }

    if (stats.longestShooterRolls >= 5) {
      insights.push(`Best shooter: ${stats.longestShooterRolls} rolls.${stats.longestShooterRolls >= 15 ? ' Hot streak!' : ''}`)
    }

    if (store.rollHistory.length >= 10) {
      const last10 = store.rollHistory.slice(0, 10)
      const sevens = last10.filter(r => r.total === 7).length
      if (sevens >= 4) {
        insights.push(`${sevens} sevens in last 10 rolls. Feels cold, but each roll is independent — the dice have no memory. Same 16.7% chance every time.`)
      }
      const rollsSince7 = store.rollHistory.findIndex(r => r.total === 7)
      if (rollsSince7 >= 12) {
        insights.push(`${rollsSince7} rolls without a 7. Feels hot, but beware the gambler's fallacy — a 7 is NOT "due." Each roll is independent.`)
      }
    }

    const betStats = stats.betTypeStats
    if (betStats.pass && betStats.pass.timesPlaced > 5) {
      const dir = betStats.pass.netProfitLoss >= 0 ? 'winning' : 'losing'
      const edge = betStats.pass.totalWagered > 0 ? ((Math.abs(betStats.pass.netProfitLoss) / betStats.pass.totalWagered) * 100).toFixed(1) : '0'
      insights.push(`Pass Line: ${betStats.pass.won}W / ${betStats.pass.lost}L — ${dir} at ${edge}% (theoretical: 1.41%).`)
    }
    if (betStats.field && betStats.field.timesPlaced > 10) {
      const edge = betStats.field.totalWagered > 0 ? ((Math.abs(betStats.field.netProfitLoss) / betStats.field.totalWagered) * 100).toFixed(1) : '0'
      const theoretical = store.tableRules.fieldTwelvePayout === 3 ? '2.78' : '5.56'
      insights.push(`Field: ${betStats.field.won}W / ${betStats.field.lost}L — ${edge}% actual (theoretical: ${theoretical}%).`)
    }

    return insights
  }

  return {
    getRecommendations,
    getSessionInsights
  }
}
