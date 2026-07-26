import { z } from 'zod'
import { db } from '../database/db'
import type { BackupPayload } from '../../types/domain'

const backupSchema = z.object({
  format: z.literal('forma-backup'),
  version: z.literal(1),
  exportedAt: z.string(),
  data: z.object({
    exercises: z.array(z.record(z.string(), z.unknown())),
    templates: z.array(z.record(z.string(), z.unknown())),
    templateExercises: z.array(z.record(z.string(), z.unknown())),
    sessions: z.array(z.record(z.string(), z.unknown())),
    sessionExercises: z.array(z.record(z.string(), z.unknown())),
    sets: z.array(z.record(z.string(), z.unknown())),
    settings: z.array(z.record(z.string(), z.unknown())),
  }),
})

export async function createBackup(): Promise<BackupPayload> {
  return {
    format: 'forma-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      exercises: await db.exercises.toArray(),
      templates: await db.templates.toArray(),
      templateExercises: await db.templateExercises.toArray(),
      sessions: await db.sessions.toArray(),
      sessionExercises: await db.sessionExercises.toArray(),
      sets: await db.sets.toArray(),
      settings: await db.settings.toArray(),
    },
  }
}

export async function downloadBackup() {
  const backup = await createBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `forma-backup-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function restoreBackup(file: File) {
  const parsed = backupSchema.parse(JSON.parse(await file.text())) as unknown as BackupPayload
  await db.transaction(
    'rw',
    [db.exercises, db.templates, db.templateExercises, db.sessions, db.sessionExercises, db.sets, db.settings],
    async () => {
      await Promise.all(db.tables.map((table) => table.clear()))
      await db.exercises.bulkPut(parsed.data.exercises)
      await db.templates.bulkPut(parsed.data.templates)
      await db.templateExercises.bulkPut(parsed.data.templateExercises)
      await db.sessions.bulkPut(parsed.data.sessions)
      await db.sessionExercises.bulkPut(parsed.data.sessionExercises)
      await db.sets.bulkPut(parsed.data.sets)
      await db.settings.bulkPut(parsed.data.settings)
    },
  )
}
