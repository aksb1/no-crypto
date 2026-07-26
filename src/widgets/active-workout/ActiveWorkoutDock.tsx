import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowUpRight, Dumbbell } from 'lucide-react'
import { Link } from 'wouter'
import { getActiveSession } from '../../storage/repositories/workoutRepository'

export function ActiveWorkoutDock() {
  const session = useLiveQuery(getActiveSession)
  if (!session) return null
  return (
    <Link href={`/session/${session.id}`} className="active-dock">
      <div className="active-dock__pulse"><Dumbbell size={18} /></div>
      <div><span>Тренировка идёт</span><strong>{session.templateNameSnapshot}</strong></div>
      <ArrowUpRight size={18} />
    </Link>
  )
}
