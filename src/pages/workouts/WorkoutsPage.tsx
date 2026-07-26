import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'motion/react'
import { Clock3, Dumbbell, Ellipsis, GripVertical, History, Pencil, Play, Plus, Search, Trash2 } from 'lucide-react'
import { Link } from 'wouter'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { WorkoutHistoryRow } from '../../components/workouts/WorkoutHistoryRow'
import { archiveTemplate, deleteCompletedSession, listCompletedSessions, listTemplateDetails, reorderTemplates, restoreTemplate } from '../../storage/repositories/workoutRepository'
import { formatDuration, formatRelative } from '../../utils/format'
import { useSwipeToDelete } from '../../hooks/useSwipeToDelete'
import type { TemplateDetails, WorkoutSession } from '../../types/domain'
import { useWorkoutStart } from '../../features/workout-session/WorkoutStartProvider'

function SortableWorkoutCard({ template, last, menuOpen, dragDisabled, onToggleMenu, onDelete, onStart }: {
  template: TemplateDetails
  last?: WorkoutSession
  menuOpen: boolean
  dragDisabled: boolean
  onToggleMenu: () => void
  onDelete: () => void
  onStart: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: template.id, disabled: dragDisabled })
  return (
    <div
      ref={setNodeRef}
      className={`sortable-workout ${isDragging ? 'sortable-workout--dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <Card className="workout-card">
        <div className="workout-card__accent" style={{ background: template.accent }} />
        <div className="workout-card__head">
          <div className="workout-icon" style={{ color: template.accent }}><Dumbbell size={22} /></div>
          <div className="workout-card__controls">
            <button className="workout-drag-handle" type="button" aria-label="Переместить тренировку" title={dragDisabled ? 'Очисти поиск, чтобы менять порядок' : 'Перетащить'} {...attributes} {...listeners}><GripVertical size={18} /></button>
            <div className="card-menu-wrap"><Button variant="ghost" size="icon" aria-label="Действия с тренировкой" onClick={onToggleMenu}><Ellipsis size={19} /></Button>{menuOpen && <div className="card-menu"><Link href={`/workouts/${template.id}/edit`}><Pencil size={15} />Изменить</Link><button onClick={onDelete}><Trash2 size={15} />Удалить</button></div>}</div>
          </div>
        </div>
        <div className="workout-card__body"><h3>{template.name}</h3><p>{template.exercises.map((item) => item.exercise.name).slice(0, 4).join(' · ')}</p></div>
        <div className="workout-card__meta"><span><Dumbbell size={14} />{template.exercises.length} упражнений</span><span><Clock3 size={14} />{last ? formatDuration(last.durationSeconds) : 'не запускалась'}</span></div>
        <div className="workout-card__footer"><span>{last ? `Последняя: ${formatRelative(last.completedAt)}` : 'Готова к первой тренировке'}</span><Button size="sm" onClick={onStart} icon={<Play size={15} fill="currentColor" />}>Начать</Button></div>
      </Card>
    </div>
  )
}

function SwipeableHistoryRow({ session, onDelete }: { session: WorkoutSession; onDelete: () => void }) {
  const swipe = useSwipeToDelete(onDelete)
  return (
    <div className="history-row-swipe">
      <div className="history-delete-layer"><Trash2 size={18} /><span>Удалить</span></div>
      <WorkoutHistoryRow session={session} style={{ transform: `translateX(${swipe.offset}px)` }} {...swipe.handlers} />
    </div>
  )
}

export function WorkoutsPage() {
  const startWorkout = useWorkoutStart()
  const templates = useLiveQuery(listTemplateDetails, [])
  const sessions = useLiveQuery(() => listCompletedSessions(), [])
  const [tab, setTab] = useState<'templates' | 'history'>('templates')
  const [query, setQuery] = useState('')
  const [menu, setMenu] = useState<string | null>(null)
  const [undoId, setUndoId] = useState<string | null>(null)
  const [deleteSessionTarget, setDeleteSessionTarget] = useState<WorkoutSession | null>(null)
  const [deleteTemplateTarget, setDeleteTemplateTarget] = useState<TemplateDetails | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const filtered = useMemo(() => templates?.filter((template) => template.name.toLowerCase().includes(query.toLowerCase())) ?? [], [templates, query])
  const lastByTemplate = useMemo(() => {
    const map = new Map<string, NonNullable<typeof sessions>[number]>()
    sessions?.forEach((session) => { if (!map.has(session.templateId)) map.set(session.templateId, session) })
    return map
  }, [sessions])

  async function handleDelete(id: string) {
    await archiveTemplate(id)
    setMenu(null)
    setUndoId(id)
    window.setTimeout(() => setUndoId((current) => current === id ? null : current), 6000)
  }

  async function handleDragEnd(event: DragEndEvent) {
    if (query.trim() || !templates || !event.over || event.active.id === event.over.id) return
    const oldIndex = templates.findIndex((template) => template.id === event.active.id)
    const newIndex = templates.findIndex((template) => template.id === event.over?.id)
    if (oldIndex < 0 || newIndex < 0) return
    const reordered = arrayMove(templates, oldIndex, newIndex)
    await reorderTemplates(reordered.map((template) => template.id))
  }

  return (
    <motion.div className="page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Training space" title="Тренировки" description="Создавай программы один раз и запускай нужную тренировку в одно касание." actions={<Link href="/workouts/new"><Button icon={<Plus size={17} />}>Новая тренировка</Button></Link>} />
      <div className="toolbar">
        <div className="segmented"><button className={tab === 'templates' ? 'active' : ''} onClick={() => setTab('templates')}><Dumbbell size={16} />Шаблоны</button><button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}><History size={16} />История</button></div>
        <label className="search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти тренировку" /></label>
      </div>
      {undoId && <div className="undo-banner"><span>Тренировка перемещена в архив</span><button onClick={async () => { await restoreTemplate(undoId); setUndoId(null) }}>Отменить</button></div>}

      {tab === 'templates' && (
        filtered.length ? <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={(templates ?? []).map((template) => template.id)} strategy={rectSortingStrategy}>
            <div className="workout-grid">
              {filtered.map((template) => <SortableWorkoutCard key={template.id} template={template} last={lastByTemplate.get(template.id)} menuOpen={menu === template.id} dragDisabled={Boolean(query.trim())} onToggleMenu={() => setMenu(menu === template.id ? null : template.id)} onDelete={() => { setMenu(null); setDeleteTemplateTarget(template) }} onStart={() => startWorkout({ id: template.id, name: template.name })} />)}
            </div>
          </SortableContext>
        </DndContext> : <EmptyState title="Здесь будут твои программы" description="Создай первую тренировку и добавь упражнения в удобном порядке." action={<Link href="/workouts/new"><Button icon={<Plus size={17} />}>Создать тренировку</Button></Link>} />
      )}

      {tab === 'history' && (
        sessions?.length ? <div className="history-list">
          <div className="swipe-hint">Смахни тренировку влево, чтобы удалить</div>
          {sessions.map((session) => <SwipeableHistoryRow key={session.id} session={session} onDelete={() => setDeleteSessionTarget(session)} />)}
        </div> : <EmptyState title="История пока пуста" description="Завершённые тренировки появятся здесь вместе с объёмом и длительностью." />
      )}
      <Modal open={Boolean(deleteSessionTarget)} onClose={() => setDeleteSessionTarget(null)} title="Удалить тренировку?">
        <div className="delete-session-confirm">
          <div className="delete-session-confirm__icon"><Trash2 size={23} /></div>
          <h3>Вы уверены, что хотите удалить тренировку?</h3>
          <p><strong>{deleteSessionTarget?.templateNameSnapshot}</strong> и все записанные в ней подходы исчезнут из истории и статистики. Это действие нельзя отменить.</p>
          <div><Button variant="secondary" onClick={() => setDeleteSessionTarget(null)}>Отмена</Button><Button variant="danger" icon={<Trash2 size={16} />} onClick={async () => { if (deleteSessionTarget) await deleteCompletedSession(deleteSessionTarget.id); setDeleteSessionTarget(null) }}>Удалить тренировку</Button></div>
        </div>
      </Modal>
      <Modal open={Boolean(deleteTemplateTarget)} onClose={() => setDeleteTemplateTarget(null)} title="Удалить шаблон тренировки?">
        <div className="delete-session-confirm">
          <div className="delete-session-confirm__icon"><Trash2 size={23} /></div>
          <h3>Удалить «{deleteTemplateTarget?.name}»?</h3>
          <p>Шаблон исчезнет из списка тренировок. Уже завершённые тренировки и их статистика останутся в истории.</p>
          <div><Button variant="secondary" onClick={() => setDeleteTemplateTarget(null)}>Отмена</Button><Button variant="danger" icon={<Trash2 size={16} />} onClick={async () => { if (deleteTemplateTarget) await handleDelete(deleteTemplateTarget.id); setDeleteTemplateTarget(null) }}>Удалить шаблон</Button></div>
        </div>
      </Modal>
    </motion.div>
  )
}
