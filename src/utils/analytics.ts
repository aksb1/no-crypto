import type { WorkoutSet } from '../types/domain'

export function calculateSetVolume(weight: number | null | undefined, repetitions: number | null | undefined) {
  return Math.max(0, weight ?? 0) * Math.max(0, repetitions ?? 0)
}

export function calculateTotalVolume(sets: WorkoutSet[], completedOnly = true) {
  return sets.reduce((total, set) => {
    if (completedOnly && !set.completed) return total
    return total + calculateSetVolume(set.weight, set.repetitions)
  }, 0)
}

export function estimateOneRepMax(weight: number | null | undefined, repetitions: number | null | undefined) {
  const safeWeight = Math.max(0, weight ?? 0)
  const safeRepetitions = Math.max(0, repetitions ?? 0)
  if (!safeWeight || !safeRepetitions) return 0
  return safeWeight * (1 + safeRepetitions / 30)
}
