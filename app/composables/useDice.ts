import type { DiceRoll } from '~/utils/betTypes'

export function useDice() {
  const store = useCrapsStore()

  function roll(): DiceRoll {
    const die1 = Math.floor(Math.random() * 6) + 1
    const die2 = Math.floor(Math.random() * 6) + 1
    const total = die1 + die2
    const isHard = die1 === die2
    return { die1, die2, total, isHard }
  }

  function rollAndApply(): DiceRoll {
    const result = roll()
    store.setCurrentRoll(result)
    return result
  }

  return { roll, rollAndApply }
}
