import { db } from '../database/db'
import type {
  Exercise,
  ExerciseStats,
  SessionDetails,
  TemplateDetails,
  TemplateDraft,
  WorkoutSet,
} from '../../types/domain'
import { createId, normalizeExerciseName } from '../../utils/id'
import { calculateTotalVolume } from '../../utils/analytics'

const now = () => new Date().toISOString()

async function findOrCreateExercise(name: string): Promise<Exercise> {
  const normalizedName = normalizeExerciseName(name)
  const existing = await db.exercises.where('normalizedName').equals(normalizedName).first()
  if (existing) {
    if (existing.archivedAt) await db.exercises.update(existing.id, { archivedAt: undefined, updatedAt: now() })
    return { ...existing, archivedAt: undefined }
  }
  const exercise: Exercise = {
    id: createId(),
    name: name.trim(),
    normalizedName,
    createdAt: now(),
    updatedAt: now(),
  }
  await db.exercises.add(exercise)
  return exercise
}

export async function listTemplateDetails(): Promise<TemplateDetails[]> {
  const templates = (await db.templates.filter((template) => !template.archivedAt).toArray())
    .sort((a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) || a.createdAt.localeCompare(b.createdAt))
  return Promise.all(templates.map(getTemplateDetails))
}

export async function getTemplateDetails(templateOrId: string | { id: string }): Promise<TemplateDetails> {
  const id = typeof templateOrId === 'string' ? templateOrId : templateOrId.id
  const template = await db.templates.get(id)
  if (!template) throw new Error('Тренировка не найдена')
  const links = await db.templateExercises.where('templateId').equals(id).sortBy('position')
  const exercises = await Promise.all(
    links.map(async (link) => {
      const exercise = await db.exercises.get(link.exerciseId)
      if (!exercise) throw new Error('Упражнение не найдено')
      return { ...link, exercise }
    }),
  )
  return { ...template, exercises }
}

export async function saveTemplate(draft: TemplateDraft, templateId?: string) {
  const timestamp = now()
  const id = templateId ?? createId()

  await db.transaction('rw', [db.templates, db.exercises, db.templateExercises], async () => {
    const current = templateId ? await db.templates.get(templateId) : undefined
    const allTemplates = current ? [] : await db.templates.toArray()
    const nextPosition = allTemplates.length
      ? Math.max(...allTemplates.map((template) => template.position ?? -1)) + 1
      : 0
    await db.templates.put({
      id,
      name: draft.name.trim(),
      accent: draft.accent,
      position: current?.position ?? nextPosition,
      createdAt: current?.createdAt ?? timestamp,
      updatedAt: timestamp,
    })

    await db.templateExercises.where('templateId').equals(id).delete()
    for (let position = 0; position < draft.exercises.length; position += 1) {
      const item = draft.exercises[position]
      const exercise = item.exerciseId
        ? await db.exercises.get(item.exerciseId)
        : await findOrCreateExercise(item.name)
      if (!exercise) continue
      if (exercise.name !== item.name.trim()) {
        await db.exercises.update(exercise.id, {
          name: item.name.trim(),
          normalizedName: normalizeExerciseName(item.name),
          updatedAt: timestamp,
        })
      }
      await db.templateExercises.add({
        id: createId(),
        templateId: id,
        exerciseId: exercise.id,
        position,
        defaultRestSeconds: item.defaultRestSeconds,
      })
    }
  })
  return id
}

export async function archiveTemplate(id: string) {
  await db.templates.update(id, { archivedAt: now(), updatedAt: now() })
}

export async function restoreTemplate(id: string) {
  await db.templates.update(id, { archivedAt: undefined, updatedAt: now() })
}

export async function reorderTemplates(templateIds: string[]) {
  await db.transaction('rw', db.templates, async () => {
    await Promise.all(templateIds.map((id, position) => db.templates.update(id, { position, updatedAt: now() })))
  })
}

export async function getActiveSession() {
  return db.sessions.where('status').equals('active').first()
}

export async function startSession(templateId: string): Promise<string> {
  const active = await getActiveSession()
  if (active) {
    if (active.templateId === templateId) return active.id
    throw new Error('Уже запущена другая тренировка')
  }

  const template = await getTemplateDetails(templateId)
  const sessionId = createId()
  const startedAt = now()

  await db.transaction('rw', [db.sessions, db.sessionExercises, db.sets], async () => {
    await db.sessions.add({
      id: sessionId,
      templateId,
      templateNameSnapshot: template.name,
      status: 'active',
      startedAt,
      totalVolume: 0,
    })

    for (const templateExercise of template.exercises) {
      const sessionExerciseId = createId()
      await db.sessionExercises.add({
        id: sessionExerciseId,
        sessionId,
        exerciseId: templateExercise.exerciseId,
        exerciseNameSnapshot: templateExercise.exercise.name,
        position: templateExercise.position,
        defaultRestSeconds: templateExercise.defaultRestSeconds,
      })

      const sourceSets = Array.from({ length: 3 }, (_, position) => ({ position }))

      for (const source of sourceSets) {
        await db.sets.add({
          id: createId(),
          sessionId,
          sessionExerciseId,
          exerciseId: templateExercise.exerciseId,
          position: source.position,
          weight: null,
          repetitions: null,
          completed: false,
        })
      }
    }
  })
  return sessionId
}

export async function getSessionDetails(sessionId: string): Promise<SessionDetails> {
  const session = await db.sessions.get(sessionId)
  if (!session) throw new Error('Сессия не найдена')
  const exercises = await db.sessionExercises.where('sessionId').equals(sessionId).sortBy('position')
  const detailed = await Promise.all(
    exercises.map(async (exercise) => ({
      ...exercise,
      sets: await db.sets.where('sessionExerciseId').equals(exercise.id).sortBy('position'),
    })),
  )
  return { ...session, exercises: detailed }
}

export async function getPreviousSessionSetHints(templateId: string): Promise<Map<string, WorkoutSet[]>> {
  const previous = (await db.sessions
    .where('[templateId+status]')
    .equals([templateId, 'completed'])
    .toArray())
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))[0]

  if (!previous) return new Map()
  const details = await getSessionDetails(previous.id)
  return new Map(details.exercises.map((exercise) => [
    exercise.exerciseId,
    exercise.sets.filter((set) => set.completed),
  ]))
}

export async function updateSet(setId: string, patch: Partial<Pick<WorkoutSet, 'weight' | 'repetitions' | 'completed'>>) {
  const set = await db.sets.get(setId)
  if (!set) return
  const completedAt = patch.completed === true ? now() : patch.completed === false ? undefined : set.completedAt
  await db.sets.update(setId, { ...patch, completedAt })
  const allSets = await db.sets.where('sessionId').equals(set.sessionId).toArray()
  const totalVolume = calculateTotalVolume(allSets)
  await db.sessions.update(set.sessionId, { totalVolume })
}

export async function addSet(sessionExerciseId: string) {
  const exercise = await db.sessionExercises.get(sessionExerciseId)
  if (!exercise) return
  const existing = await db.sets.where('sessionExerciseId').equals(sessionExerciseId).sortBy('position')
  await db.sets.add({
    id: createId(),
    sessionId: exercise.sessionId,
    sessionExerciseId,
    exerciseId: exercise.exerciseId,
    position: existing.length,
    weight: null,
    repetitions: null,
    completed: false,
  })
}

export async function removeSet(setId: string) {
  const set = await db.sets.get(setId)
  if (!set) return
  await db.sets.delete(setId)
  const remaining = await db.sets.where('sessionExerciseId').equals(set.sessionExerciseId).sortBy('position')
  await Promise.all(remaining.map((item, index) => db.sets.update(item.id, { position: index })))
}

export async function completeSession(sessionId: string) {
  const session = await db.sessions.get(sessionId)
  if (!session) return
  const completedAt = now()
  await db.sessions.update(sessionId, {
    status: 'completed',
    completedAt,
    durationSeconds: Math.max(1, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000)),
  })
}

export async function cancelSession(sessionId: string) {
  await db.transaction('rw', [db.sessions, db.sessionExercises, db.sets], async () => {
    await db.sets.where('sessionId').equals(sessionId).delete()
    await db.sessionExercises.where('sessionId').equals(sessionId).delete()
    await db.sessions.delete(sessionId)
  })
}

export async function deleteCompletedSession(sessionId: string) {
  await db.transaction('rw', [db.sessions, db.sessionExercises, db.sets], async () => {
    const session = await db.sessions.get(sessionId)
    if (!session || session.status !== 'completed') return
    await db.sets.where('sessionId').equals(sessionId).delete()
    await db.sessionExercises.where('sessionId').equals(sessionId).delete()
    await db.sessions.delete(sessionId)
  })
}

export async function listCompletedSessions(limit?: number) {
  const sorted = (await db.sessions.where('status').equals('completed').toArray())
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
  return limit ? sorted.slice(0, limit) : sorted
}

export async function getExerciseStats(): Promise<ExerciseStats[]> {
  const exercises = await db.exercises.toArray()
  const completedSessionIds = new Set(
    (await db.sessions.where('status').equals('completed').toArray()).map((session) => session.id),
  )
  const result: ExerciseStats[] = []

  for (const exercise of exercises) {
    const allSets = (await db.sets.where('exerciseId').equals(exercise.id).toArray()).filter(
      (set) => set.completed && completedSessionIds.has(set.sessionId),
    )
    if (!allSets.length) continue
    const sessionIds = [...new Set(allSets.map((set) => set.sessionId))]
    const sessions = await db.sessions.bulkGet(sessionIds)
    const orderedSessions = sessions.filter(Boolean).sort((a, b) =>
      (a?.completedAt ?? '').localeCompare(b?.completedAt ?? ''),
    )
    const lastSession = orderedSessions.at(-1)
    const lastSets = lastSession ? allSets.filter((set) => set.sessionId === lastSession.id) : []
    const weights = allSets.map((set) => set.weight ?? 0)
    const repetitions = allSets.map((set) => set.repetitions ?? 0)
    const weightedSets = allSets.filter((set) => (set.weight ?? 0) > 0)
    result.push({
      exercise,
      totalVolume: allSets.reduce((sum, set) => sum + (set.weight ?? 0) * (set.repetitions ?? 0), 0),
      bestWeight: Math.max(...weights),
      bestRepetitions: Math.max(...repetitions),
      workoutCount: sessionIds.length,
      setCount: allSets.length,
      averageWeight: weightedSets.length
        ? weightedSets.reduce((sum, set) => sum + (set.weight ?? 0), 0) / weightedSets.length
        : 0,
      lastResult: lastSession?.completedAt ? { date: lastSession.completedAt, sets: lastSets } : undefined,
    })
  }
  return result.sort((a, b) => b.totalVolume - a.totalVolume)
}
