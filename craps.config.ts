export const crapsConfig = {
  table: {
    maxPlayers: 8,
    heroPosition: 0
  },

  stakes: [
    { level: 1, name: 'Low Roller', minBet: 500, maxBet: 50000, defaultBankroll: 20000, oddsMultiple: '3-4-5x' as const },
    { level: 2, name: 'Standard', minBet: 1000, maxBet: 200000, defaultBankroll: 50000, oddsMultiple: '3-4-5x' as const },
    { level: 3, name: 'Mid Stakes', minBet: 2500, maxBet: 500000, defaultBankroll: 200000, oddsMultiple: '5x' as const },
    { level: 4, name: 'High Roller', minBet: 10000, maxBet: 1000000, defaultBankroll: 500000, oddsMultiple: '10x' as const },
    { level: 5, name: 'Whale', minBet: 50000, maxBet: 5000000, defaultBankroll: 2500000, oddsMultiple: '20x' as const }
  ],
  defaultStakeLevel: 2,

  defaultTableRules: {
    oddsMultiple: '3-4-5x' as const,
    fieldTwelvePayout: 3 as const,
    buyVigTiming: 'on_win' as const,
    hardwaysOnComeOut: false,
    payoutRounding: 'dollar' as const
  },

  payouts: {
    passLine: { win: [1, 1] as [number, number] },
    dontPass: { win: [1, 1] as [number, number] },
    come: { win: [1, 1] as [number, number] },
    dontCome: { win: [1, 1] as [number, number] },
    passOdds: { 4: [2, 1], 5: [3, 2], 6: [6, 5], 8: [6, 5], 9: [3, 2], 10: [2, 1] } as Record<number, [number, number]>,
    dontOdds: { 4: [1, 2], 5: [2, 3], 6: [5, 6], 8: [5, 6], 9: [2, 3], 10: [1, 2] } as Record<number, [number, number]>,
    place: { 4: [9, 5], 5: [7, 5], 6: [7, 6], 8: [7, 6], 9: [7, 5], 10: [9, 5] } as Record<number, [number, number]>,
    buy: { 4: [2, 1], 5: [3, 2], 6: [6, 5], 8: [6, 5], 9: [3, 2], 10: [2, 1] } as Record<number, [number, number]>,
    lay: { 4: [1, 2], 5: [2, 3], 6: [5, 6], 8: [5, 6], 9: [2, 3], 10: [1, 2] } as Record<number, [number, number]>,
    field: { 2: [2, 1], 3: [1, 1], 4: [1, 1], 9: [1, 1], 10: [1, 1], 11: [1, 1], 12: [3, 1] } as Record<number, [number, number]>,
    hardway: { 4: [7, 1], 6: [9, 1], 8: [9, 1], 10: [7, 1] } as Record<number, [number, number]>,
    any7: { win: [4, 1] as [number, number] },
    anyCraps: { win: [7, 1] as [number, number] },
    aces: { win: [30, 1] as [number, number] },
    boxcars: { win: [30, 1] as [number, number] },
    aceDeuce: { win: [15, 1] as [number, number] },
    yo: { win: [15, 1] as [number, number] },
    big6: { win: [1, 1] as [number, number] },
    big8: { win: [1, 1] as [number, number] },
    horn: { 2: [30, 1], 3: [15, 1], 11: [15, 1], 12: [30, 1] } as Record<number, [number, number]>,
    ce: { craps: [3, 1] as [number, number], eleven: [7, 1] as [number, number] },
    hopEasy: { win: [15, 1] as [number, number] },
    hopHard: { win: [30, 1] as [number, number] }
  },

  houseEdges: {
    passLine: 0.01414,
    dontPass: 0.01364,
    come: 0.01414,
    dontCome: 0.01364,
    passOdds: 0.0,
    dontOdds: 0.0,
    place6: 0.01515,
    place8: 0.01515,
    place5: 0.04000,
    place9: 0.04000,
    place4: 0.06667,
    place10: 0.06667,
    buy4VigOnWin: 0.01667,
    buy10VigOnWin: 0.01667,
    buy4VigOnBet: 0.04762,
    buy10VigOnBet: 0.04762,
    field2x3x: 0.02778,
    field2x2x: 0.05556,
    hard6: 0.09091,
    hard8: 0.09091,
    hard4: 0.11111,
    hard10: 0.11111,
    any7: 0.16667,
    anyCraps: 0.11111,
    aces: 0.13889,
    boxcars: 0.13889,
    aceDeuce: 0.11111,
    yo: 0.11111,
    big6: 0.09091,
    big8: 0.09091
  },

  oddsMultiples: {
    '1x': { 4: 1, 5: 1, 6: 1, 8: 1, 9: 1, 10: 1 },
    '2x': { 4: 2, 5: 2, 6: 2, 8: 2, 9: 2, 10: 2 },
    '3-4-5x': { 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3 },
    '5x': { 4: 5, 5: 5, 6: 5, 8: 5, 9: 5, 10: 5 },
    '10x': { 4: 10, 5: 10, 6: 10, 8: 10, 9: 10, 10: 10 },
    '20x': { 4: 20, 5: 20, 6: 20, 8: 20, 9: 20, 10: 20 },
    '100x': { 4: 100, 5: 100, 6: 100, 8: 100, 9: 100, 10: 100 }
  } as Record<string, Record<number, number>>,

  botStrategies: [
    { name: 'Conservative Carl', system: 'pass_max_odds' },
    { name: "Don't Debbie", system: 'dont_pass_lay' },
    { name: 'Iron Cross Irene', system: 'iron_cross' },
    { name: 'Martingale Mike', system: 'martingale' },
    { name: 'Regression Rick', system: 'regression' },
    { name: 'Press Patricia', system: 'press' },
    { name: 'Prop Bet Pete', system: 'props_only' },
    { name: 'Three-Point Molly', system: 'three_point' }
  ],

  animation: {
    diceRollDuration: 1300,
    payoutDelay: 300,
    betweenRollsPause: 1000,
    autoRollSpeeds: [500, 1000, 2000, 5000],
    sevenOutPause: 2500
  },

  stats: {
    rollHistorySize: 200,
    bankrollHistorySize: 500,
    hotShooterThreshold: 15
  },

  storage: {
    localStorageKey: 'craps-simulator-session'
  }
}

export type CrapsConfig = typeof crapsConfig
export type StakeLevel = typeof crapsConfig.stakes[number]
export type OddsMultipleKey = keyof typeof crapsConfig.oddsMultiples
