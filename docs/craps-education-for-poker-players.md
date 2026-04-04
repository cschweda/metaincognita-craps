# Craps: A Complete Education for a Poker Player

## The Core Concept (What Craps Actually Is)

Forget everything you know about poker strategy. In poker, you're playing against other humans, exploiting their mistakes, managing hidden information, and making decisions that change your expected value. In craps, you're playing against pure mathematics. There's no hidden information, no opponent to read, no decision that changes the underlying probabilities. The dice don't care about your strategy.

What craps *does* offer is a choice: which bets to make. And that choice — the only real decision you have — determines whether you're paying the casino 1.4% of your action or 16.7% of your action. The entire intellectual challenge of craps is understanding which bets are which, and why.

Think of it this way: in poker, the game is the decisions. In craps, the game is the bet selection. Once you've placed your chips, the math is locked in. The dice just execute the probability distribution.

---

## The Dice (The Only Thing That Matters)

Two six-sided dice. 36 equally likely outcomes. The number 7 can be made six different ways (1-6, 2-5, 3-4, 4-3, 5-2, 6-1). No other number comes close. This single fact — that 7 is the most common roll — is the engine that drives the entire game.

The distribution is symmetric around 7:

- 6 and 8: 5 ways each
- 5 and 9: 4 ways each
- 4 and 10: 3 ways each
- 3 and 11: 2 ways each
- 2 and 12: 1 way each

Everything in craps flows from these frequencies. Every payout, every house edge, every strategy — it all comes back to how many ways you can make your number versus how many ways you can make a 7.

---

## How a Round Works

A round of craps has two phases, tracked by a physical puck on the table that reads ON on one side and OFF on the other.

**Phase 1 — The Come-Out Roll (Puck OFF)**

One player (the "shooter") rolls the dice. Three things can happen:

If they roll 7 or 11, that's a "natural." Pass Line bets win immediately, the round is over, same shooter rolls again. This happens 8 out of 36 rolls (22.2%).

If they roll 2, 3, or 12, that's "craps." Pass Line bets lose immediately, the round is over, same shooter rolls again. This happens 4 out of 36 rolls (11.1%).

If they roll anything else (4, 5, 6, 8, 9, or 10), that number becomes "the point." The puck flips to ON and moves to that number on the table. Now you're in Phase 2.

**Phase 2 — The Point Phase (Puck ON)**

The shooter keeps rolling. Only two outcomes matter now:

If they roll the point number again, Pass Line bets win. The puck goes back to OFF. New come-out roll, same shooter.

If they roll a 7, that's "seven-out." Pass Line bets lose. The puck goes to OFF. The dice pass to the next shooter.

Everything else is irrelevant to the Pass Line bet — the shooter just keeps rolling until one of those two things happens. But during this phase, all the other bet types are available, and this is where the game gets deep.

---

## The Four Bets You Need to Know

### 1. Pass Line (House Edge: 1.41%)

This is the foundational bet. You place it before the come-out roll. It wins on a natural (7/11), loses on craps (2/3/12), and if a point is established, it wins if the point is made before a 7.

The house edge is exactly 7/495 = 1.414%. On a $10 bet, you're paying the casino about 14 cents per decision. At roughly 30 decisions per hour, that's about $4.24/hour. This is one of the best bets in any casino game.

Once a point is established, the Pass Line bet becomes a "contract" — you can't take it back. This matters because the math has shifted against you: during the come-out, you had 8 ways to win and 4 ways to lose (2:1 in your favor). But once a point is set, the 7 has 6 ways and your point has only 3-5 ways. The casino won't let you leave when the odds turn.

### 2. Don't Pass (House Edge: 1.36%)

The mirror image. You're betting against the shooter. Wins on 2 or 3 on the come-out, loses on 7 or 11, and pushes (tie) on 12. If a point is set, you win if 7 comes before the point.

The push on 12 is how the casino gets its edge on what would otherwise be a perfectly fair "opposite" bet. Without the bar-12, Don't Pass would be a pure mirror of Pass with zero house edge. That one barred number — a 1-in-36 event — creates the entire 1.36% edge.

Don't Pass is slightly better mathematically than Pass (1.36% vs 1.41%), but most players avoid it because you're betting against everyone else at the table. In a social game where the whole table cheers when the shooter makes the point, being the one person who wins when everyone else loses makes you unpopular. The casino exploits this social pressure beautifully — the mathematically worse bet is the popular one.

Interesting wrinkle: once a point is established, the Don't Pass bettor actually has the advantage (more ways to roll 7 than any point number). The casino will let you take down a Don't Pass bet at any time — because they *want* you to give up your edge. Never take down a Don't Pass bet after the point. The advisor in our simulator will flag this aggressively.

### 3. Odds Bets (House Edge: 0.00%)

This is the single most important concept in craps and the reason the game is worth playing.

After a point is established, you can place an additional "odds" bet behind your Pass Line (or Don't Pass) bet. This odds bet pays at *true mathematical odds* — the actual probability of the event occurring. No house edge whatsoever. Zero. It's the only bet in any casino game with a 0% house edge.

The payouts:
- Point 4 or 10: pays 2:1 (3 ways to make it, 6 ways to make 7 — true odds are 2:1 against you, so the casino pays 2:1)
- Point 5 or 9: pays 3:2
- Point 6 or 8: pays 6:5

Why does the casino offer this? Because you can only make an odds bet if you already have a Pass Line bet (which has a 1.41% edge). The odds bet dilutes the effective house edge across your total action without eliminating it. With 3-4-5× odds (a common table rule), the combined edge on Pass + Odds drops to about 0.37%. With 100× odds (rare but offered at some casinos), it drops to about 0.02%.

The strategic implication is profound: **you should always bet the minimum on the Pass Line and the maximum on odds.** The Pass Line is the tax. The odds are the free ride. A $10 Pass Line with $50 in 5× odds has the same $10 exposed to the 1.41% edge, but the remaining $50 is at 0%. Your effective edge on $60 total action is about 0.24%.

### 4. Come Bet (House Edge: 1.41%)

A Come bet is mathematically identical to a Pass Line bet, but you can place it after a point is already established. Your next roll becomes your personal "come-out roll" — if it's 7 or 11 you win, if it's 2/3/12 you lose, and any other number becomes your "Come Point." You can add odds behind it just like a Pass Line bet.

Why bother? Because it lets you have multiple numbers working simultaneously. If the Pass Line point is 6, you can place a Come bet, and if it lands on 8, now you have both 6 and 8 working for you — each with odds. The "Three-Point Molly" strategy (Pass + 2 Come bets + max odds on all three) keeps three numbers active at all times, maximizing the amount of action at the lowest possible house edge.

The Come bet is also where the most confusing moment in craps happens: if a 7 rolls when you have an established Come Point and a newly placed Come bet, the new Come bet *wins* (7 is a natural for its first roll) while the established Come bet *loses* (seven-out). Both happen on the same roll. This is correct and your simulator must handle it.

---

## Where the Casino Kills You (The Bets to Avoid)

Everything in the center of the table is a trap. The casino puts it there because the payouts look exciting and the house edge is catastrophic.

**Any 7 (House Edge: 16.67%)** — The worst bet on the table. You're betting that the next roll is a 7. Pays 4:1. True odds are 5:1 (6 ways out of 36). The casino pockets the difference. On a $5 bet, you're paying $0.83 per roll. At 100 rolls per hour, that's $83/hour. For comparison, the Pass Line costs about $4/hour.

**Hardways (House Edge: 9.09% to 11.11%)** — You're betting that a specific pair (like 3+3 for hard 6) rolls before either a 7 or an "easy" version of that number (like 2+4). Hard 6 has 1 way to win and 10 ways to lose (4 easy ways + 6 seven ways). Pays 9:1. True odds are 10:1. 

**Proposition Bets — Aces, Boxcars, 3, 11 (House Edge: 11.11% to 13.89%)** — One-roll bets on specific totals. Aces (snake eyes, 2) has 1 way in 36 to win and pays 30:1 instead of the true 35:1. The 5-unit gap between true odds and payout odds is pure casino profit.

**Horn Bet (House Edge: 12.50%)** — A four-way split across 2, 3, 11, and 12. Four units at risk, one might win per roll if you're lucky. The math is simply the weighted average of four individually terrible bets.

**Big 6 / Big 8 (House Edge: 9.09%)** — This is the most instructive sucker bet on the table. It pays even money when 6 (or 8) rolls before 7. Place 6 does the exact same thing but pays 7:6. Same bet, same number, same dice — but Big 6 costs you six times more in house edge (9.09% vs 1.52%). The casino puts Big 6 in an easy-to-reach spot on the layout specifically because uninformed players will grab it instead of asking the dealer for a Place 6.

---

## The Middle Ground (Not Great, Not Terrible)

**Place 6 and Place 8 (House Edge: 1.52%)** — Bet that 6 (or 8) rolls before 7. Pays 7:6. This is the third-best bet on the table after Pass/Come with odds. Many experienced players use Place 6 and Place 8 as their primary action because they resolve frequently (11 out of every 36 rolls) and the edge is low. Proper bet sizing matters: always bet in multiples of $6 so the 7:6 payout comes out even.

**Place 5 and Place 9 (House Edge: 4.00%)** — Pays 7:5. Noticeably worse than 6/8 but still under 5%. Acceptable in small doses.

**Place 4 and Place 10 (House Edge: 6.67%)** — Pays 9:5. The payout is well below true odds (which would be 2:1). If you want to bet on 4 or 10, use a Buy bet instead.

**Buy 4 and Buy 10 with vig on win (House Edge: 1.67%)** — A Buy bet pays at true odds (2:1 for 4/10) but charges a 5% commission. If the casino only charges the commission when you win (not every time you place the bet), the effective edge is 1.67% — dramatically better than the 6.67% Place bet on the same number. Always ask about vig timing.

**Field Bet (House Edge: 2.78% or 5.56%)** — A one-roll bet that wins on 2, 3, 4, 9, 10, 11, or 12. Loses on 5, 6, 7, 8. Looks great because it covers 7 of 11 possible totals — but the losing numbers (5, 6, 7, 8) account for 20 of 36 combinations while the winning numbers only cover 16. The bonus payouts on 2 and 12 (2:1 or 3:1 depending on the casino) partially compensate. If 12 pays 3:1, the edge is 2.78% — tolerable. If 12 pays 2:1, the edge jumps to 5.56% — avoid it.

---

## Can You "Win" at Craps?

No. Not in the long run. The house has a mathematical edge on every bet except odds (which require a flat bet that does have an edge). No betting system, no pattern recognition, no streak analysis, no "dice setting" technique can overcome this.

But "winning" is the wrong frame. The right question is: *how cheaply can you buy entertainment?*

A player making Pass Line bets with 3-4-5× odds at a $10 table is paying roughly $11/hour in expected losses. That's cheaper than a movie, a concert, or most bar tabs. A player making the same bets at a $5 table with 10× odds is paying about $3/hour. For a social, adrenaline-pumping, hours-long experience — that's remarkable value.

Contrast that with the player throwing $5 on every proposition bet he can reach: he's paying $50-80/hour and probably doesn't know it.

The "skill" in craps is knowing the difference.

---

## Why Systems Don't Work (But Why People Believe They Do)

**The Martingale** — Double your bet after every loss. After a win, you're up one unit. Sounds bulletproof. The problem: losing streaks are longer than your bankroll or the table maximum. A $10 bettor who loses 7 in a row needs $1,280 for the next bet. After 10 losses, $10,240. The system doesn't change the house edge on any individual bet — it just concentrates the risk into rare, catastrophic losses. You'll win on 95% of sessions and lose your entire bankroll on the other 5%. The expected value is identical to flat betting.

**The Iron Cross** — Place 5, 6, 8 plus a Field bet. You win on every number except 7. Looks incredible — you're winning on 83% of rolls. But the 7, which comes 16.7% of the time, wipes out all your Place bets simultaneously. The math: you win small amounts frequently and lose large amounts occasionally. Net expected value: negative, roughly -3.9% of total action. The system exploits a cognitive bias — humans overweight frequency of wins and underweight magnitude of losses.

**Dice Control / Dice Setting** — The theory that you can physically influence the dice to land on specific faces by setting them in a particular orientation and throwing with a controlled motion. Whether this works in a real casino (where the dice must hit the rubber pyramid wall at the far end of the table) is hotly debated. The math: if you could reduce the frequency of 7 from 16.67% to just 15.67% (a 1-percentage-point shift), you'd flip the house edge on Pass Line bets to a player advantage. But no peer-reviewed study has ever demonstrated this level of control under casino conditions.

The honest truth is that every system is just a different way of arranging the same negative-expectation bets. You can change the shape of the variance curve — more small wins and fewer big losses, or vice versa — but you can't change the area under it. The house always wins in aggregate.

---

## The Optimal Strategy (What a Smart Player Does)

1. **Bet the table minimum on Pass Line (or Don't Pass).** This is the entry fee.
2. **Take maximum odds.** This is where your real money goes — at zero house edge.
3. **Optionally add 1-2 Come bets with maximum odds.** More numbers working, same low edge. This is the Three-Point Molly.
4. **Never touch the center of the table.** No hardways, no propositions, no horn, no Any 7. Ever.
5. **If you want more action, use Place 6 and Place 8.** Low edge (1.52%), frequent payouts.
6. **If you want to bet on 4 or 10, use Buy bets with vig on win only.** 1.67% edge beats the 6.67% Place bet.
7. **Set a loss limit and a session time.** The house edge is small but it's relentless. Don't chase.

That's the whole strategy. There's nothing else. The game is solved.

---

## Why Craps Is Still Worth Playing

If the game is solved and the house always wins, why does anyone play? Because craps offers something no other casino game does: shared social energy with transparent mathematics.

In blackjack, you sit alone and make decisions that might be wrong. In slots, you press a button and wait. In poker, you're adversaries. In craps, the entire table wins and loses together. When the shooter is on a hot roll — 15, 20, 30 numbers without a seven-out — the table erupts. Strangers high-five. Chip stacks grow in front of everyone simultaneously. It's genuine collective joy over a shared random event, and there's nothing else like it in a casino.

The mathematics are also completely transparent. Every probability is derivable from first principles by anyone who can count to 36. There are no hidden shuffles, no algorithms, no software — just two cubes, gravity, and arithmetic. You can verify every house edge with a pencil.

And the house edge on the good bets is genuinely small. A disciplined player making Pass + max odds is paying less per hour than a cup of coffee. The casino's profit comes not from grinding disciplined players — it comes from the proposition bets, the field bets, the Big 6, and the players who don't know the difference.

That's what makes this simulator valuable as a learning tool. The difference between an informed craps player and an uninformed one isn't a subtle statistical edge — it's the difference between paying $4/hour and $80/hour for the same experience. Our simulator makes that visible by showing every player, in real time, exactly what each bet is costing them.

---

## Quick Reference Card

| Bet | House Edge | Verdict |
|-----|-----------|---------|
| Pass/Come + Max Odds | ~0.37% (3-4-5×) | Best available |
| Don't Pass/Don't Come + Lay Odds | ~0.27% (3-4-5×) | Slightly better, socially awkward |
| Place 6 or 8 | 1.52% | Good |
| Buy 4 or 10 (vig on win) | 1.67% | Good |
| Field (12 pays 3:1) | 2.78% | Acceptable |
| Place 5 or 9 | 4.00% | Mediocre |
| Field (12 pays 2:1) | 5.56% | Bad |
| Place 4 or 10 | 6.67% | Bad |
| Big 6 / Big 8 | 9.09% | Sucker bet |
| Hard 6 / Hard 8 | 9.09% | Sucker bet |
| Hard 4 / Hard 10 | 11.11% | Sucker bet |
| Any Craps | 11.11% | Sucker bet |
| Horn | 12.50% | Sucker bet |
| Aces / Boxcars | 13.89% | Sucker bet |
| Any 7 | 16.67% | Worst bet in the casino |
