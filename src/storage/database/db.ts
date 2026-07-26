import Dexie, { type EntityTable } from 'dexie'
import type {
  AppSettings,
  Exercise,
  SessionExercise,
  TemplateExercise,
  WorkoutSession,
  WorkoutSet,
  WorkoutTemplate,
} from '../../types/domain'

export class FormaDatabase extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>
  templates!: EntityTable<WorkoutTemplate, 'id'>
  templateExercises!: EntityTable<TemplateExercise, 'id'>
  sessions!: EntityTable<WorkoutSession, 'id'>
  sessionExercises!: EntityTable<SessionExercise, 'id'>
  sets!: EntityTable<WorkoutSet, 'id'>
  settings!: EntityTable<AppSettings, 'id'>

  constructor() {
    super('forma-training-journal')

    this.version(1).stores({
      exercises: 'id, normalizedName, updatedAt, archivedAt',
      templates: 'id, updatedAt, archivedAt',
      templateExercises: 'id, templateId, exerciseId, [templateId+position]',
      sessions: 'id, templateId, status, startedAt, completedAt, [templateId+status]',
      sessionExercises: 'id, sessionId, exerciseId, [sessionId+position]',
      sets: 'id, sessionId, sessionExerciseId, exerciseId, [sessionExerciseId+position]',
      settings: 'id',
    })

    this.version(2).stores({
      exercises: 'id, normalizedName, updatedAt, archivedAt',
      templates: 'id, position, updatedAt, archivedAt',
      templateExercises: 'id, templateId, exerciseId, [templateId+position]',
      sessions: 'id, templateId, status, startedAt, completedAt, [templateId+status]',
      sessionExercises: 'id, sessionId, exerciseId, [sessionId+position]',
      sets: 'id, sessionId, sessionExerciseId, exerciseId, [sessionExerciseId+position]',
      settings: 'id',
    }).upgrade(async (transaction) => {
      const table = transaction.table<WorkoutTemplate, string>('templates')
      const templates = (await table.toArray()).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      await Promise.all(templates.map((template, position) => table.update(template.id, { position })))
    })

    this.on('populate', () => {
      this.settings.add({
        id: 'app',
        weightUnit: 'kg',
        defaultRestSeconds: 90,
        autoStartTimer: true,
        reducedMotion: false,
        theme: 'dark',
      })
    })
  }
}

export const db = new FormaDatabase()
