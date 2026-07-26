import { createContext, useContext, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, Play } from 'lucide-react'
import { useLocation } from 'wouter'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { cancelSession, getActiveSession, startSession } from '../../storage/repositories/workoutRepository'

interface WorkoutTarget {
  id: string
  name: string
}

interface StartConflict {
  activeId: string
  activeName: string
  target: WorkoutTarget
}

const WorkoutStartContext = createContext<((target: WorkoutTarget) => Promise<void>) | null>(null)

export function WorkoutStartProvider({ children }: { children: ReactNode }) {
  const [, navigate] = useLocation()
  const [conflict, setConflict] = useState<StartConflict | null>(null)
  const [starting, setStarting] = useState(false)
  const startingRef = useRef(false)

  async function openSession(target: WorkoutTarget) {
    if (startingRef.current) return
    startingRef.current = true
    setStarting(true)
    try {
      const active = await getActiveSession()
      if (!active) {
        navigate(`/session/${await startSession(target.id)}`)
        return
      }
      if (active.templateId === target.id) {
        navigate(`/session/${active.id}`)
        return
      }
      setConflict({ activeId: active.id, activeName: active.templateNameSnapshot, target })
    } finally {
      startingRef.current = false
      setStarting(false)
    }
  }

  async function replaceSession() {
    if (!conflict || startingRef.current) return
    const current = conflict
    startingRef.current = true
    setStarting(true)
    try {
      await cancelSession(current.activeId)
      const sessionId = await startSession(current.target.id)
      setConflict(null)
      navigate(`/session/${sessionId}`)
    } finally {
      startingRef.current = false
      setStarting(false)
    }
  }

  return (
    <WorkoutStartContext.Provider value={openSession}>
      {children}
      <Modal open={Boolean(conflict)} onClose={() => !starting && setConflict(null)} title="Начать другую тренировку?">
        <div className="start-conflict">
          <div className="start-conflict__icon"><AlertTriangle size={23} /></div>
          <h3>Сейчас идёт «{conflict?.activeName}»</h3>
          <p>Чтобы начать «{conflict?.target.name}», незавершённая текущая тренировка и введённые в ней подходы будут удалены.</p>
          <div><Button variant="secondary" disabled={starting} onClick={() => setConflict(null)}>Оставить текущую</Button><Button icon={<Play size={16} />} loading={starting} onClick={replaceSession}>Начать новую</Button></div>
        </div>
      </Modal>
    </WorkoutStartContext.Provider>
  )
}

export function useWorkoutStart() {
  const context = useContext(WorkoutStartContext)
  if (!context) throw new Error('useWorkoutStart must be used inside WorkoutStartProvider')
  return context
}
