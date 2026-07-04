import { describe, it, expect } from 'vitest'
import type { DiceRoll } from '../../app/utils/betTypes'
import { transition, getStickmanCall } from '../../app/engine/resolution'

// ---- Helpers ----

function roll(die1: number, die2: number): DiceRoll {
  return { die1, die2, total: die1 + die2, isHard: die1 === die2 }
}

describe('transition', () => {
  it('come-out natural (7) stays on come-out with no point', () => {
    const result = transition('COME_OUT', roll(3, 4), null)
    expect(result).toEqual({ newPhase: 'COME_OUT', newPoint: null })
  })

  it('come-out natural (11) stays on come-out with no point', () => {
    const result = transition('COME_OUT', roll(5, 6), null)
    expect(result).toEqual({ newPhase: 'COME_OUT', newPoint: null })
  })

  it('come-out craps (2, 3, or 12) stays on come-out with no point', () => {
    expect(transition('COME_OUT', roll(1, 1), null)).toEqual({ newPhase: 'COME_OUT', newPoint: null })
    expect(transition('COME_OUT', roll(1, 2), null)).toEqual({ newPhase: 'COME_OUT', newPoint: null })
    expect(transition('COME_OUT', roll(6, 6), null)).toEqual({ newPhase: 'COME_OUT', newPoint: null })
  })

  it('come-out establishes the point on any other total', () => {
    const result = transition('COME_OUT', roll(2, 4), null)
    expect(result).toEqual({ newPhase: 'POINT_PHASE', newPoint: 6 })
  })

  it('point-phase: point made returns to come-out with no point', () => {
    const result = transition('POINT_PHASE', roll(2, 4), 6)
    expect(result).toEqual({ newPhase: 'COME_OUT', newPoint: null })
  })

  it('point-phase: seven-out moves to SEVEN_OUT with no point', () => {
    const result = transition('POINT_PHASE', roll(3, 4), 6)
    expect(result).toEqual({ newPhase: 'SEVEN_OUT', newPoint: null })
  })

  it('point-phase: any other roll keeps the same phase and point', () => {
    const result = transition('POINT_PHASE', roll(1, 2), 6)
    expect(result).toEqual({ newPhase: 'POINT_PHASE', newPoint: 6 })
  })
})

describe('getStickmanCall', () => {
  it('calls seven-out during point phase', () => {
    const call = getStickmanCall(roll(3, 4), 'POINT_PHASE', 6)
    expect(call.type).toBe('sevenout')
    expect(call.message).toBe('Seven out! Line away!')
  })

  it('calls the point winner (easy)', () => {
    const call = getStickmanCall(roll(2, 4), 'POINT_PHASE', 6)
    expect(call.type).toBe('winner')
    expect(call.message).toBe('6! Winner! Pay the line!')
  })

  it('calls the point winner with the hard-way suffix', () => {
    const call = getStickmanCall(roll(2, 2), 'POINT_PHASE', 4)
    expect(call.type).toBe('winner')
    expect(call.message).toBe('4! Winner the hard way! Pay the line!')
  })

  it('calls come-out natural seven', () => {
    const call = getStickmanCall(roll(3, 4), 'COME_OUT', null)
    expect(call.type).toBe('natural')
    expect(call.message).toBe('Seven! Winner! Front line winner!')
  })

  it('calls come-out natural yo-eleven', () => {
    const call = getStickmanCall(roll(5, 6), 'COME_OUT', null)
    expect(call.type).toBe('natural')
    expect(call.message).toBe('Yo-eleven! Winner!')
  })

  it('calls come-out craps on 2 (aces)', () => {
    const call = getStickmanCall(roll(1, 1), 'COME_OUT', null)
    expect(call.type).toBe('craps')
    expect(call.message).toBe('Aces! Craps! Line away.')
  })

  it('calls come-out craps on 3 (ace-deuce)', () => {
    const call = getStickmanCall(roll(1, 2), 'COME_OUT', null)
    expect(call.type).toBe('craps')
    expect(call.message).toBe('Ace-deuce! Craps! Line away.')
  })

  it('calls come-out craps on 12 (boxcars)', () => {
    const call = getStickmanCall(roll(6, 6), 'COME_OUT', null)
    expect(call.type).toBe('craps')
    expect(call.message).toBe('Boxcars! Craps! Line away.')
  })

  it('calls point established on come-out', () => {
    const call = getStickmanCall(roll(4, 5), 'COME_OUT', null)
    expect(call.type).toBe('point')
    expect(call.message).toBe('Point is 9. Mark it.')
  })

  it('calls a neutral roll with hard naming', () => {
    const call = getStickmanCall(roll(4, 4), 'POINT_PHASE', 5)
    expect(call.type).toBe('neutral')
    expect(call.message).toBe('Hard eight. 4 and 4.')
  })

  it('calls a neutral roll with easy naming', () => {
    const call = getStickmanCall(roll(5, 3), 'POINT_PHASE', 5)
    expect(call.type).toBe('neutral')
    expect(call.message).toBe('Eight, easy. 5 and 3.')
  })
})
