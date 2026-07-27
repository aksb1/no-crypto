import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Check, CheckCircle2, ChevronDown, Clock3, Dumbbell, History, Plus, RotateCcw, Sparkles, TimerReset, Trash2, Trophy } from 'lucide-react'
import { useLocation, useParams } from 'wouter'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { useRestTimer } from '../../features/rest-timer/useRestTimer'
import { addSet, cancelSession, completeSession, getPreviousSessionSetHints, getSessionDetails, removeSet, updateSet } from '../../storage/repositories/workoutRepository'
import type { SessionExercise, WorkoutSet } from '../../types/domain'
import { formatCompact, formatDuration, formatNumber } from '../../utils/format'
import { ExerciseHistoryModal } from '../../widgets/exercise-history/ExerciseHistoryModal'
import { db } from '../../storage/database/db'
import { useSwipeToDelete } from '../../hooks/useSwipeToDelete'

function parseInputNumber(value: string) {
  return value === '' ? null : Number(value)
}

function SetRow({ set, previousSet, number, nextSetId, onComplete, onSubmit, onRemove }: {
  set: WorkoutSet
  previousSet?: WorkoutSet
  number: number
  nextSetId?: string
  onComplete: () => void
  onSubmit: (values: { weight: number | null; repetitions: number }) => Promise<void>
  onRemove: () => void
}) {
  const swipe = useSwipeToDelete(onRemove)
  const weightInput = useRef<HTMLInputElement>(null)
  const repetitionsInput = useRef<HTMLInputElement>(null)
  const submitting = useRef(false)

  async function submitSet() {
    if (submitting.current || !repetitionsInput.current?.value) return
    submitting.current = true
    try {
      await onSubmit({
        weight: parseInputNumber(weightInput.current?.value ?? ''),
        repetitions: Number(repetitionsInput.current.value),
      })
      if (nextSetId) {
        window.requestAnimationFrame(() => {
          const nextInput = document.getElementById(`set-weight-${nextSetId}`) as HTMLInputElement | null
          nextInput?.focus()
          nextInput?.select()
        })
      }
    } finally {
      submitting.current = false
    }
  }

  return (
    <div className="set-row-swipe">
      <div className="swipe-delete-layer"><Trash2 size={17} /><span>Удалить</span></div>
      <div className={`set-row ${set.completed ? 'set-row--completed' : ''}`} style={{ transform: `translateX(${swipe.offset}px)` }} {...swipe.handlers}>
        <div className="set-number">{number}</div>
        <label className="set-input"><span>Вес, кг</span><input ref={weightInput} id={`set-weight-${set.id}`} type="number" inputMode="decimal" enterKeyHint="next" min="0" step="0.5" defaultValue={set.weight ?? ''} placeholder={previousSet?.weight != null ? formatNumber(previousSet.weight) : undefined} onBlur={(event) => updateSet(set.id, { weight: parseInputNumber(event.target.value) })} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); repetitionsInput.current?.focus(); repetitionsInput.current?.select() } }} /></label>
        <span className="set-multiply">×</span>
        <label className="set-input"><span>Повторы</span><input ref={repetitionsInput} type="number" inputMode="numeric" enterKeyHint="next" min="0" step="1" defaultValue={set.repetitions ?? ''} placeholder={previousSet?.repetitions != null ? String(previousSet.repetitions) : undefined} onBlur={(event) => updateSet(set.id, { repetitions: parseInputNumber(event.target.value) })} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void submitSet() } }} /></label>
        <div className="set-volume"><span>объём</span><strong>{formatNumber((set.weight ?? 0) * (set.repetitions ?? 0))}</strong></div>
        <button className={`complete-set ${set.completed ? 'active' : ''}`} onClick={onComplete} aria-label="Завершить подход"><Check size={18} /></button>
        <button className="remove-set" onClick={onRemove} aria-label="Удалить подход"><Trash2 size={15} /></button>
      </div>
    </div>
  )
}

function ExerciseCard({ exercise, previousSets, index, onHistory, autoStartTimer }: { exercise: SessionExercise & { sets: WorkoutSet[] }; previousSets?: WorkoutSet[]; index: number; onHistory: () => void; autoStartTimer: boolean }) {
  const completed = exercise.sets.filter((set) => set.completed).length
  const isComplete = exercise.sets.length > 0 && completed === exercise.sets.length
  const [collapsed, setCollapsed] = useState(index !== 0 || isComplete)
  const { start } = useRestTimer()
  const volume = exercise.sets.reduce((sum, set) => sum + (set.completed ? (set.weight ?? 0) * (set.repetitions ?? 0) : 0), 0)

  async function toggleSet(set: WorkoutSet) {
    const next = !set.completed
    const completesExercise = next && exercise.sets.every((item) => item.id === set.id || item.completed)
    await updateSet(set.id, { completed: next })
    if (next && autoStartTimer && exercise.defaultRestSeconds > 0) start(exercise.defaultRestSeconds)
    if (completesExercise) setCollapsed(true)
  }

  async function submitSet(set: WorkoutSet, values: { weight: number | null; repetitions: number }) {
    const completesExercise = exercise.sets.every((item) => item.id === set.id || item.completed)
    await updateSet(set.id, { ...values, completed: true })
    if (!set.completed && autoStartTimer && exercise.defaultRestSeconds > 0) start(exercise.defaultRestSeconds)
    if (completesExercise) setCollapsed(true)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
      <Card className={`exercise-card ${isComplete ? 'exercise-card--complete' : ''}`}>
        <header className="exercise-card__header" role="button" tabIndex={0} aria-expanded={!collapsed} onClick={() => setCollapsed((value) => !value)} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setCollapsed((value) => !value) } }}>
          <div className="exercise-index">{String(index + 1).padStart(2, '0')}</div>
          <div className="exercise-title"><span>Упражнение</span><h2>{exercise.exerciseNameSnapshot}</h2><div><span><CheckCircle2 size={14} />{completed}/{exercise.sets.length} подходов</span><span><Dumbbell size={14} />{formatNumber(volume)} кг</span></div></div>
          <div className="exercise-card__actions"><Button variant="ghost" size="sm" icon={<History size={15} />} onClick={(event) => { event.stopPropagation(); onHistory() }}>История</Button><ChevronDown size={18} className={`exercise-chevron ${collapsed ? 'rotate' : ''}`} /></div>
        </header>
        <AnimatePresence initial={false}>
          {!collapsed && <motion.div className="exercise-card__body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
            <div className="sets-labels"><span>Подход</span><span>Текущий результат</span><span>Объём</span></div>
            <div className="sets-list">{exercise.sets.map((set, setIndex) => {
              const nextSet = exercise.sets.slice(setIndex + 1).find((item) => !item.completed)
                ?? exercise.sets.slice(0, setIndex).find((item) => !item.completed)
              return <SetRow key={set.id} set={set} previousSet={previousSets?.[setIndex]} number={setIndex + 1} nextSetId={nextSet?.id} onComplete={() => toggleSet(set)} onSubmit={(values) => submitSet(set, values)} onRemove={() => removeSet(set.id)} />
            })}</div>
            <div className="exercise-footer"><Button variant="secondary" size="sm" icon={<Plus size={16} />} onClick={() => addSet(exercise.id)}>Добавить подход</Button>{exercise.defaultRestSeconds > 0 ? <button className="rest-quick" onClick={() => start(exercise.defaultRestSeconds)}><TimerReset size={15} />Отдых {exercise.defaultRestSeconds} сек</button> : <span className="rest-disabled">Таймер отдыха отключён</span>}</div>
          </motion.div>}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}

export function ActiveWorkoutPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [, navigate] = useLocation()
  const session = useLiveQuery(() => sessionId ? getSessionDetails(sessionId) : undefined, [sessionId])
  const settings = useLiveQuery(() => db.settings.get('app'), [])
  const previousSetHints = useLiveQuery(
    () => session ? getPreviousSessionSetHints(session.templateId) : Promise.resolve(new Map<string, WorkoutSet[]>()),
    [session?.templateId],
  )
  const [elapsed, setElapsed] = useState(0)
  const [finishOpen, setFinishOpen] = useState(false)
  const [historyExercise, setHistoryExercise] = useState<{ id: string; name: string } | null>(null)
  const [finishing, setFinishing] = useState(false)

  useEffect(() => {
    if (!session) return
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000)))
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [session?.startedAt])

  const totals = useMemo(() => {
    const sets = session?.exercises.flatMap((exercise) => exercise.sets) ?? []
    return { total: sets.length, completed: sets.filter((set) => set.completed).length, volume: sets.reduce((sum, set) => sum + (set.completed ? (set.weight ?? 0) * (set.repetitions ?? 0) : 0), 0) }
  }, [session])

  if (!session) return <div className="loading-screen"><div className="loading-orb" /><span>Загружаем тренировку…</span></div>

  async function handleFinish() {
    if (!sessionId) return
    setFinishing(true)
    await completeSession(sessionId)
    useRestTimer.getState().stop()
    navigate('/workouts/history')
  }

  async function handleCancel() {
    if (!sessionId || !window.confirm('Отменить тренировку? Текущий прогресс будет удалён.')) return
    await cancelSession(sessionId)
    useRestTimer.getState().stop()
    navigate('/workouts')
  }

  return (
    <motion.div className="active-workout-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <header className="workout-session-header">
        <div className="workout-session-header__left"><Button variant="ghost" size="icon" onClick={() => navigate('/workouts')}><ArrowLeft size={19} /></Button><div><span className="live-label"><i />Тренировка идёт</span><h1>{session.templateNameSnapshot}</h1></div></div>
        <div className="session-live-metrics"><div><Clock3 size={20} /><span>Время</span><strong>{formatDuration(elapsed)}</strong></div><div><Dumbbell size={20} /><span>Объём</span><strong>{formatCompact(totals.volume)} кг</strong></div><div><CheckCircle2 size={20} /><span>Подходы</span><strong>{totals.completed}/{totals.total}</strong></div></div>
        <div className="workout-session-header__actions"><Button variant="ghost" size="sm" icon={<RotateCcw size={15} />} onClick={handleCancel}>Отменить</Button></div>
      </header>
      <div className="session-progress"><motion.div animate={{ width: `${totals.total ? (totals.completed / totals.total) * 100 : 0}%` }} /></div>
      <div className="active-exercise-list">
        <div className="workout-focus-intro"><div><span>Сегодня</span><h2>Работай в своём ритме</h2><p>Серые цифры — прошлый результат. «Перейти» отметит подход и откроет следующий.</p></div><div className="focus-orb"><Sparkles size={23} /></div></div>
        {session.exercises.map((exercise, index) => <ExerciseCard key={exercise.id} exercise={exercise} previousSets={previousSetHints?.get(exercise.exerciseId)} index={index} autoStartTimer={settings?.autoStartTimer ?? true} onHistory={() => setHistoryExercise({ id: exercise.exerciseId, name: exercise.exerciseNameSnapshot })} />)}
        <Card className="session-finish-panel">
          <div><CheckCircle2 size={22} /><span>Все упражнения выполнены?</span><strong>Заверши тренировку и сохрани результат в историю</strong></div>
          <Button size="lg" icon={<CheckCircle2 size={18} />} onClick={() => setFinishOpen(true)}>Завершить тренировку</Button>
        </Card>
      </div>

      <ExerciseHistoryModal exerciseId={historyExercise?.id ?? ''} exerciseName={historyExercise?.name ?? ''} open={Boolean(historyExercise)} onClose={() => setHistoryExercise(null)} />
      <Modal open={finishOpen} onClose={() => setFinishOpen(false)} title="Завершить тренировку?">
        <div className="finish-summary"><div className="finish-trophy"><Trophy size={27} /></div><h3>Отличная работа</h3><p>Результаты сохранятся в истории и статистике.</p><div className="finish-summary__metrics"><div><span>Время</span><strong>{formatDuration(elapsed)}</strong></div><div><span>Подходы</span><strong>{totals.completed}</strong></div><div><span>Объём</span><strong>{formatCompact(totals.volume)} кг</strong></div></div><div className="finish-summary__actions"><Button variant="secondary" onClick={() => setFinishOpen(false)}>Продолжить</Button><Button loading={finishing} onClick={handleFinish} icon={<CheckCircle2 size={17} />}>Сохранить результат</Button></div></div>
      </Modal>
    </motion.div>
  )
}
