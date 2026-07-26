import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays, TrendingUp } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { db } from '../../storage/database/db'
import { formatDateLong, formatNumber } from '../../utils/format'

export function ExerciseHistoryModal({ exerciseId, exerciseName, open, onClose }: { exerciseId: string; exerciseName: string; open: boolean; onClose: () => void }) {
  const history = useLiveQuery(async () => {
    if (!open) return []
    const links = await db.sessionExercises.where('exerciseId').equals(exerciseId).toArray()
    const rows = await Promise.all(links.map(async (link) => {
      const session = await db.sessions.get(link.sessionId)
      if (!session || session.status !== 'completed') return null
      const sets = (await db.sets.where('sessionExerciseId').equals(link.id).sortBy('position')).filter((set) => set.completed)
      return { session, sets }
    }))
    return rows.filter((row): row is NonNullable<typeof row> => Boolean(row)).sort((a, b) => (b.session.completedAt ?? '').localeCompare(a.session.completedAt ?? ''))
  }, [exerciseId, open])

  return (
    <Modal open={open} onClose={onClose} title={exerciseName} wide>
      <div className="history-modal-intro"><div className="round-icon"><TrendingUp size={18} /></div><div><strong>История упражнения</strong><span>Все завершённые рабочие подходы</span></div></div>
      {history?.length ? <div className="exercise-history-list">
        {history.map(({ session, sets }) => (
          <div className="exercise-history-item" key={session.id}>
            <div className="exercise-history-item__date"><CalendarDays size={15} /><span>{formatDateLong(session.completedAt)}</span></div>
            <div className="exercise-history-item__sets">{sets.map((set) => <span key={set.id}><strong>{formatNumber(set.weight ?? 0)}</strong> × {set.repetitions ?? 0}</span>)}</div>
            <div className="exercise-history-item__volume"><strong>{formatNumber(sets.reduce((sum, set) => sum + (set.weight ?? 0) * (set.repetitions ?? 0), 0))} кг</strong><span>объём</span></div>
          </div>
        ))}
      </div> : <div className="modal-empty">История появится после завершения первой тренировки с этим упражнением.</div>}
    </Modal>
  )
}
