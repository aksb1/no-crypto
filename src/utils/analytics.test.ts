import { describe, expect, it } from 'vitest'
import type { WorkoutSet } from '../types/domain'
import { calculateSetVolume, calculateTotalVolume, estimateOneRepMax } from './analytics'
import { normalizeExerciseName } from './id'
import { formatTimer } from './format'

const set = (weight: number, repetitions: number, completed: boolean): WorkoutSet => ({
  id: crypto.randomUUID(),
  sessionId: 'session',
  sessionExerciseId: 'session-exercise',
  exerciseId: 'exercise',
  position: 0,
  weight,
  repetitions,
  completed,
})

describe('training analytics', () => {
  it('calculates set and completed workout volume', () => {
    const sets = [set(80, 8, true), set(80, 7, true), set(75, 10, false)]
    expect(calculateSetVolume(80, 8)).toBe(640)
    expect(calculateTotalVolume(sets)).toBe(1200)
    expect(calculateTotalVolume(sets, false)).toBe(1950)
  })

  it('calculates estimated one-rep max using Epley formula', () => {
    expect(estimateOneRepMax(100, 5)).toBeCloseTo(116.67, 1)
    expect(estimateOneRepMax(null, 10)).toBe(0)
  })
})

describe('input normalization', () => {
  it('normalizes spaces and letter case in exercise names', () => {
    expect(normalizeExerciseName('  Жим   ЛЁЖА ')).toBe('жим лёжа')
  })

  it('formats rest time predictably', () => {
    expect(formatTimer(90)).toBe('01:30')
    expect(formatTimer(-10)).toBe('00:00')
  })
})
