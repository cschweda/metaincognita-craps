import { defineStore } from 'pinia'
import type { GamePhase, DiceRoll, ActiveBet, BetResolution, TableRules, PlayerState, SessionStats } from '~/utils/betTypes'
import { resetBetIdCounter, syncBetIdCounter } from '~/utils/betTypes'
import { parseSession } from '~/utils/session'
import { staysUpAfterWin } from '~/engine/betting'
import { getUpfrontVig } from '~/engine/payouts'
import { crapsConfig } from '~~/craps.config'

export const useCrapsStore = defineStore('craps', {
  state: () => ({
    // Game state
    phase: 'SETUP' as GamePhase,
    point: null as number | null,
    puckState: 'OFF' as 'ON' | 'OFF',
    shooterSeat: 0,
    rollNumber: 0,
    shooterRollCount: 0,

    // Dice
    currentRoll: null as DiceRoll | null,
    rollHistory: [] as DiceRoll[],

    // Bets
    activeBets: [] as ActiveBet[],
    lastResolutions: [] as BetResolution[],

    // Don't bet removal tracking (MBS 3.16.1)
    dontBetRemovedThisCycle: new Set<string>() as Set<string>,

    // Table rules
    tableRules: {
      minBet: crapsConfig.stakes[crapsConfig.defaultStakeLevel - 1]!.minBet,
      maxBet: crapsConfig.stakes[crapsConfig.defaultStakeLevel - 1]!.maxBet,
      oddsMultiple: crapsConfig.defaultTableRules.oddsMultiple,
      fieldTwelvePayout: crapsConfig.defaultTableRules.fieldTwelvePayout,
      buyVigTiming: crapsConfig.defaultTableRules.buyVigTiming,
      hardwaysOnComeOut: crapsConfig.defaultTableRules.hardwaysOnComeOut,
      payoutRounding: crapsConfig.defaultTableRules.payoutRounding
    } as TableRules,

    // Players
    players: [] as PlayerState[],

    // Session stats
    sessionStats: {
      rollsWitnessed: 0,
      pointsEstablished: 0,
      pointsMade: 0,
      pointsMissed: 0,
      totalWagered: 0,
      totalProfitLoss: 0,
      longestShooterRolls: 0,
      betTypeStats: {},
      bankrollHistory: []
    } as SessionStats,

    // Stickman call
    stickmanCall: '',
    stickmanCallType: '' as '' | 'natural' | 'craps' | 'point' | 'winner' | 'sevenout' | 'neutral',

    // Selected chip denomination (cents)
    selectedChipValue: 1000,

    // True from the moment the dice leave the shooter's hand until the roll
    // is resolved. "No more bets": nothing may be placed or taken down in
    // that window, because the outcome is already decided. Never persisted.
    diceInAir: false
  }),

  getters: {
    hero: (state): PlayerState | undefined => state.players.find(p => p.isHero),
    bots: (state): PlayerState[] => state.players.filter(p => !p.isHero),
    heroBets: (state): ActiveBet[] => state.activeBets.filter(b => b.owner === 'hero' && b.status !== 'resolved'),
    isPuckOn: (state): boolean => state.puckState === 'ON',
    isComingOut: (state): boolean => state.phase === 'COME_OUT',
    isPointPhase: (state): boolean => state.phase === 'POINT_PHASE',
    canPlaceBets: (state): boolean => ['COME_OUT', 'POINT_PHASE', 'BETWEEN_ROLLS'].includes(state.phase),
    canRoll: (state): boolean => ['COME_OUT', 'POINT_PHASE'].includes(state.phase),

    activeBetsForOwner: state => (owner: string): ActiveBet[] => {
      return state.activeBets.filter(b => b.owner === owner && b.status !== 'resolved')
    },

    currentShooter: (state): PlayerState | undefined => state.players[state.shooterSeat],

    chipDenominations: (state): number[] => {
      const min = state.tableRules.minBet
      if (min >= 10000) return [2500, 10000, 50000, 100000]
      if (min >= 2500) return [500, 2500, 10000, 50000]
      if (min >= 1000) return [500, 1000, 2500, 10000]
      return [100, 500, 2500, 10000]
    }
  },

  actions: {
    initializeGame(config: {
      heroName: string
      bankroll: number
      stakeLevel: number
      tableRules: Partial<TableRules>
      bots: Array<{ name: string, strategy: string }>
    }) {
      const stake = crapsConfig.stakes[config.stakeLevel - 1]!

      this.tableRules = {
        minBet: stake.minBet,
        maxBet: stake.maxBet,
        oddsMultiple: config.tableRules.oddsMultiple ?? stake.oddsMultiple,
        fieldTwelvePayout: config.tableRules.fieldTwelvePayout ?? crapsConfig.defaultTableRules.fieldTwelvePayout,
        buyVigTiming: config.tableRules.buyVigTiming ?? crapsConfig.defaultTableRules.buyVigTiming,
        hardwaysOnComeOut: config.tableRules.hardwaysOnComeOut ?? crapsConfig.defaultTableRules.hardwaysOnComeOut,
        payoutRounding: config.tableRules.payoutRounding ?? crapsConfig.defaultTableRules.payoutRounding
      }

      this.players = [
        {
          id: 'hero',
          name: config.heroName,
          bankroll: config.bankroll,
          startingBankroll: config.bankroll,
          isHero: true,
          isBusted: false,
          strategy: null,
          lossStreak: 0,
          bankrollHistory: [config.bankroll]
        },
        ...config.bots.map((bot, i) => ({
          id: `bot-${i}`,
          name: bot.name,
          bankroll: config.bankroll,
          startingBankroll: config.bankroll,
          isHero: false,
          isBusted: false,
          strategy: bot.strategy,
          lossStreak: 0,
          bankrollHistory: [config.bankroll]
        }))
      ]

      this.selectedChipValue = stake.minBet
      this.phase = 'COME_OUT'
      this.point = null
      this.puckState = 'OFF'
      this.rollNumber = 0
      this.shooterRollCount = 0
      this.shooterSeat = 0
      this.activeBets = []
      resetBetIdCounter()
      this.lastResolutions = []
      this.currentRoll = null
      this.rollHistory = []
      this.dontBetRemovedThisCycle = new Set()
      this.diceInAir = false
      this.sessionStats = {
        rollsWitnessed: 0,
        pointsEstablished: 0,
        pointsMade: 0,
        pointsMissed: 0,
        totalWagered: 0,
        totalProfitLoss: 0,
        longestShooterRolls: 0,
        betTypeStats: {},
        bankrollHistory: [config.bankroll]
      }

      this.saveToLocalStorage()
    },

    setPhase(phase: GamePhase) {
      this.phase = phase
    },

    setPoint(point: number | null) {
      this.point = point
      this.puckState = point !== null ? 'ON' : 'OFF'
    },

    setCurrentRoll(roll: DiceRoll) {
      this.currentRoll = roll
      this.rollNumber++
      this.shooterRollCount++
      this.rollHistory.unshift(roll)
      if (this.rollHistory.length > crapsConfig.stats.rollHistorySize) {
        this.rollHistory.pop()
      }
      this.sessionStats.rollsWitnessed++
      if (this.shooterRollCount > this.sessionStats.longestShooterRolls) {
        this.sessionStats.longestShooterRolls = this.shooterRollCount
      }
    },

    /**
     * Put a bet on the table. `upfrontVig` is a fee collected on top of the
     * wager (Buy bets on a vig-on-bet table); it is a real cost, so it counts
     * against profit/loss the moment it is paid.
     */
    addBet(bet: ActiveBet, upfrontVig = 0) {
      this.activeBets.push(bet)
      const player = this.players.find(p => p.id === bet.owner)
      if (player) {
        player.bankroll -= bet.amount + upfrontVig
      }
      // Session stats describe the hero's play; bots keep their own bankrolls.
      if (!player?.isHero) return
      this.recordWager(bet)
      this.sessionStats.betTypeStats[bet.type]!.netProfitLoss -= upfrontVig
      this.sessionStats.totalProfitLoss -= upfrontVig
    },

    /** Count one wager's worth of action in the hero's stats. */
    recordWager(bet: ActiveBet) {
      this.sessionStats.totalWagered += bet.amount
      const stats = this.sessionStats.betTypeStats[bet.type] ??= {
        timesPlaced: 0, won: 0, lost: 0, pushed: 0, totalWagered: 0, netProfitLoss: 0
      }
      stats.timesPlaced++
      stats.totalWagered += bet.amount
    },

    /**
     * Take a bet off the table without action, returning the wager (and any
     * up-front vig) to its owner. Because the bet never faced a roll's
     * outcome, it is also backed out of the wagering stats — otherwise
     * putting a chip down and picking it back up inflates "total wagered"
     * and dilutes the session's measured house edge.
     */
    removeBet(betId: string, refundVig?: number) {
      const idx = this.activeBets.findIndex(b => b.id === betId)
      if (idx === -1) return
      const bet = this.activeBets[idx]!
      const refund = refundVig ?? 0
      const player = this.players.find(p => p.id === bet.owner)
      if (player) {
        player.bankroll += bet.amount + refund
      }
      if (player?.isHero) {
        this.sessionStats.totalWagered = Math.max(0, this.sessionStats.totalWagered - bet.amount)
        const stats = this.sessionStats.betTypeStats[bet.type]
        if (stats) {
          stats.timesPlaced = Math.max(0, stats.timesPlaced - 1)
          stats.totalWagered = Math.max(0, stats.totalWagered - bet.amount)
          stats.netProfitLoss += refund
        }
        this.sessionStats.totalProfitLoss += refund
      }
      if (bet.type === 'dontPass' || bet.type === 'dontCome') {
        this.dontBetRemovedThisCycle.add(`${bet.owner}-${bet.type}`)
      }
      this.activeBets.splice(idx, 1)
    },

    applyResolutions(resolutions: BetResolution[]) {
      this.lastResolutions = resolutions
      for (const res of resolutions) {
        const bet = this.activeBets.find(b => b.id === res.betId)
        if (!bet) continue
        const player = this.players.find(p => p.id === res.owner)
        if (!player) continue

        // Place, Buy, Lay, Hardway and Big 6/8 bets are paid and left up:
        // the winnings go to the rack and the wager keeps working. On a
        // vig-on-bet table a Buy bet owes its vig again for the next decision.
        const staysUp = res.outcome === 'win' && staysUpAfterWin(bet.type)
        const nextVig = staysUp ? getUpfrontVig(bet.type, bet.amount, this.tableRules) : 0

        if (staysUp) {
          player.bankroll += res.payout - bet.amount - nextVig
        } else {
          bet.status = 'resolved'
          bet.resolvedOnRoll = this.rollNumber
          if (res.outcome === 'win') {
            player.bankroll += res.payout
          } else if (res.outcome === 'push') {
            player.bankroll += bet.amount
          }
          // loses: wager already deducted on placement
        }

        player.bankrollHistory.push(player.bankroll)
        if (player.bankrollHistory.length > crapsConfig.stats.bankrollHistorySize) {
          player.bankrollHistory.splice(0, player.bankrollHistory.length - crapsConfig.stats.bankrollHistorySize)
        }

        if (!player.isHero) continue
        const stats = this.sessionStats.betTypeStats[bet.type]
        if (stats) {
          if (res.outcome === 'win') stats.won++
          else if (res.outcome === 'lose') stats.lost++
          else if (res.outcome === 'push') stats.pushed++
          stats.netProfitLoss += res.netGain - nextVig
        }
        this.sessionStats.totalProfitLoss += res.netGain - nextVig
        // The wager left up is fresh action on the next decision.
        if (staysUp) this.recordWager(bet)
      }
      // Clean up resolved bets
      this.activeBets = this.activeBets.filter(b => b.status !== 'resolved')

      this.refreshBusted()
    },

    /**
     * Busted = cannot cover the table minimum AND has nothing left riding.
     * Judged after a whole roll has been paid — a player whose last chips are
     * on the felt is still in the game, and a loss followed by a win on the
     * same roll is not a bust.
     */
    refreshBusted() {
      for (const player of this.players) {
        player.isBusted = player.bankroll < this.tableRules.minBet
          && !this.activeBets.some(b => b.owner === player.id && b.status !== 'resolved')
      }
    },

    advanceShooter() {
      this.shooterRollCount = 0
      this.refreshBusted()
      // The dice pass to the next player still in the game. A busted bot's
      // seat is skipped; the hero always takes a turn (and with a single
      // player the dice simply come back).
      const seats = this.players.length
      for (let step = 1; step <= seats; step++) {
        const seat = (this.shooterSeat + step) % seats
        const player = this.players[seat]!
        if (player.isHero || !player.isBusted) {
          this.shooterSeat = seat
          break
        }
      }
      this.dontBetRemovedThisCycle = new Set()
    },

    setStickmanCall(message: string, type: '' | 'natural' | 'craps' | 'point' | 'winner' | 'sevenout' | 'neutral') {
      this.stickmanCall = message
      this.stickmanCallType = type
    },

    setSelectedChip(value: number) {
      this.selectedChipValue = value
    },

    saveToLocalStorage() {
      try {
        const data = {
          phase: this.phase,
          point: this.point,
          puckState: this.puckState,
          shooterSeat: this.shooterSeat,
          rollNumber: this.rollNumber,
          shooterRollCount: this.shooterRollCount,
          currentRoll: this.currentRoll,
          rollHistory: this.rollHistory,
          activeBets: this.activeBets,
          tableRules: this.tableRules,
          players: this.players,
          sessionStats: this.sessionStats,
          selectedChipValue: this.selectedChipValue,
          dontBetRemovedThisCycle: [...this.dontBetRemovedThisCycle]
        }
        localStorage.setItem(crapsConfig.storage.localStorageKey, JSON.stringify(data))
      } catch {
        // localStorage unavailable or full — silently fail
      }
    },

    loadFromLocalStorage(): boolean {
      try {
        const raw = localStorage.getItem(crapsConfig.storage.localStorageKey)
        if (!raw) return false
        // Stored state is untrusted: validate and rebuild it field by field.
        const data = parseSession(JSON.parse(raw))
        if (!data) {
          localStorage.removeItem(crapsConfig.storage.localStorageKey)
          return false
        }
        this.phase = data.phase
        this.point = data.point
        this.puckState = data.puckState
        this.shooterSeat = data.shooterSeat
        this.rollNumber = data.rollNumber
        this.shooterRollCount = data.shooterRollCount
        this.currentRoll = data.currentRoll
        this.rollHistory = data.rollHistory
        this.activeBets = data.activeBets
        syncBetIdCounter(this.activeBets.map(b => b.id))
        this.tableRules = data.tableRules
        this.players = data.players
        this.sessionStats = data.sessionStats
        this.selectedChipValue = data.selectedChipValue
        this.dontBetRemovedThisCycle = new Set(data.dontBetRemovedThisCycle)
        this.diceInAir = false
        return true
      } catch {
        try {
          localStorage.removeItem(crapsConfig.storage.localStorageKey)
        } catch { /* storage unavailable — nothing to clean up */ }
        return false
      }
    },

    clearSession() {
      try {
        localStorage.removeItem(crapsConfig.storage.localStorageKey)
      } catch { /* ignore */ }
      this.$reset()
    }
  }
})
