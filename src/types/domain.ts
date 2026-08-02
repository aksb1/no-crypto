export type ID = string

export interface Exercise {
  id: ID
  name: string
  normalizedName: string
  createdAt: string
  updatedAt: string
  archivedAt?: string
}

export interface WorkoutTemplate {
  id: ID
  name: string
  accent: string
  position: number
  createdAt: string
  updatedAt: string
  archivedAt?: string
}

export interface TemplateExercise {
  id: ID
  templateId: ID
  exerciseId: ID
  position: number
  defaultRestSeconds: number
  notes?: string
}

export type SessionStatus = 'active' | 'completed' | 'cancelled'

export interface WorkoutSession {
  id: ID
  templateId: ID
  templateNameSnapshot: string
  status: SessionStatus
  startedAt: string
  completedAt?: string
  durationSeconds?: number
  totalVolume: number
  completedSetCount?: number
  notes?: string
}

export interface SessionExercise {
  id: ID
  sessionId: ID
  exerciseId: ID
  exerciseNameSnapshot: string
  position: number
  defaultRestSeconds: number
  notes?: string
}

export interface WorkoutSet {
  id: ID
  sessionId: ID
  sessionExerciseId: ID
  exerciseId: ID
  position: number
  weight: number | null
  repetitions: number | null
  completed: boolean
  restSeconds?: number
  completedAt?: string
}

export interface AppSettings {
  id: 'app'
  weightUnit: 'kg' | 'lb'
  defaultRestSeconds: number
  autoStartTimer: boolean
  reducedMotion: boolean
  theme: 'dark'
}

export interface TemplateDraftExercise {
  id?: ID
  exerciseId?: ID
  name: string
  defaultRestSeconds: number
}

export interface TemplateDraft {
  name: string
  accent: string
  exercises: TemplateDraftExercise[]
}

export interface TemplateDetails extends WorkoutTemplate {
  exercises: Array<TemplateExercise & { exercise: Exercise }>
}

export interface SessionDetails extends WorkoutSession {
  exercises: Array<SessionExercise & { sets: WorkoutSet[] }>
}

export interface ExerciseStats {
  exercise: Exercise
  totalVolume: number
  bestWeight: number
  bestRepetitions: number
  workoutCount: number
  setCount: number
  averageWeight: number
  lastResult?: {
    date: string
    sets: WorkoutSet[]
  }
}

export interface BackupPayload {
  format: 'forma-backup'
  version: 1
  exportedAt: string
  data: {
    exercises: Exercise[]
    templates: WorkoutTemplate[]
    templateExercises: TemplateExercise[]
    sessions: WorkoutSession[]
    sessionExercises: SessionExercise[]
    sets: WorkoutSet[]
    settings: AppSettings[]
  }
}
