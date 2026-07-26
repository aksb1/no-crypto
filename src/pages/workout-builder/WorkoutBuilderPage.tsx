import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowLeft, Check, Clock3, GripVertical, Plus, Trash2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useLocation, useParams } from 'wouter'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { getTemplateDetails, saveTemplate } from '../../storage/repositories/workoutRepository'
import type { TemplateDraftExercise } from '../../types/domain'
import { createId } from '../../utils/id'
import { db } from '../../storage/database/db'

const accents = ['#6d8cff', '#8b6cff', '#34d399', '#f59e72', '#e66bb2', '#54c5f8']

interface DraftItem extends TemplateDraftExercise { localId: string }

function SortableExercise({ item, index, onChange, onDelete }: { item: DraftItem; index: number; onChange: (patch: Partial<DraftItem>) => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.localId })
  return (
    <div ref={setNodeRef} className={`builder-exercise ${isDragging ? 'builder-exercise--dragging' : ''}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <button className="drag-handle" {...attributes} {...listeners} aria-label="Изменить порядок"><GripVertical size={18} /></button>
      <div className="builder-exercise__number">{String(index + 1).padStart(2, '0')}</div>
      <label className="field builder-exercise__name"><span>Упражнение</span><input value={item.name} onChange={(event) => onChange({ name: event.target.value })} placeholder="Например, жим лёжа" /></label>
      <label className="field rest-field"><span>Отдых</span><div><Clock3 size={15} /><select value={item.defaultRestSeconds} onChange={(event) => onChange({ defaultRestSeconds: Number(event.target.value) })}><option value={0}>Откл.</option><option value={30}>30 сек</option><option value={60}>60 сек</option><option value={90}>90 сек</option><option value={120}>120 сек</option><option value={180}>180 сек</option></select></div></label>
      <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Удалить упражнение"><Trash2 size={17} /></Button>
    </div>
  )
}

export function WorkoutBuilderPage() {
  const { templateId } = useParams<{ templateId?: string }>()
  const [, navigate] = useLocation()
  const existing = useLiveQuery(() => templateId ? getTemplateDetails(templateId) : undefined, [templateId])
  const settings = useLiveQuery(() => db.settings.get('app'), [])
  const [name, setName] = useState('')
  const [accent, setAccent] = useState(accents[0])
  const [exercises, setExercises] = useState<DraftItem[]>([{ localId: createId(), name: '', defaultRestSeconds: 90 }])
  const [saving, setSaving] = useState(false)
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const defaultRestApplied = useRef(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  useEffect(() => {
    if (!existing || loadedId === existing.id) return
    setName(existing.name)
    setAccent(existing.accent)
    setExercises(existing.exercises.map((item) => ({ localId: createId(), id: item.id, exerciseId: item.exerciseId, name: item.exercise.name, defaultRestSeconds: item.defaultRestSeconds })))
    setLoadedId(existing.id)
  }, [existing, loadedId])

  useEffect(() => {
    if (templateId || !settings || defaultRestApplied.current) return
    defaultRestApplied.current = true
    setExercises((current) => current.map((exercise) => ({
      ...exercise,
      defaultRestSeconds: settings.defaultRestSeconds,
    })))
  }, [settings, templateId])

  function addExercise() {
    setExercises((current) => [...current, {
      localId: createId(),
      name: '',
      defaultRestSeconds: settings?.defaultRestSeconds ?? 90,
    }])
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setExercises((items) => {
      const oldIndex = items.findIndex((item) => item.localId === active.id)
      const newIndex = items.findIndex((item) => item.localId === over.id)
      return arrayMove(items, oldIndex, newIndex)
    })
  }

  async function handleSave() {
    const validExercises = exercises.filter((exercise) => exercise.name.trim())
    if (!name.trim()) return window.alert('Добавь название тренировки')
    if (!validExercises.length) return window.alert('Добавь хотя бы одно упражнение')
    setSaving(true)
    try {
      await saveTemplate({ name, accent, exercises: validExercises }, templateId)
      navigate('/workouts')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div className="page builder-page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Workout builder" title={templateId ? 'Редактировать тренировку' : 'Новая тренировка'} description="Собери удобный порядок упражнений. Всё можно изменить позже." actions={<Button variant="secondary" icon={<ArrowLeft size={17} />} onClick={() => navigate('/workouts')}>Назад</Button>} />
      <div className="builder-layout">
        <Card className="builder-settings">
          <div className="settings-section"><span className="card-kicker">Основное</span><label className="field"><span>Название тренировки</span><input className="large-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Например, Грудь + руки" autoFocus={!templateId} /></label></div>
          <div className="settings-section"><span className="card-kicker">Акцент</span><div className="accent-picker">{accents.map((color) => <button key={color} className={accent === color ? 'active' : ''} style={{ background: color }} onClick={() => setAccent(color)} aria-label={`Цвет ${color}`}>{accent === color && <Check size={15} />}</button>)}</div></div>
          <div className="builder-preview"><div className="builder-preview__glow" style={{ background: accent }} /><div className="workout-icon" style={{ color: accent }}><Check size={21} /></div><span>Предпросмотр</span><strong>{name || 'Название тренировки'}</strong><small>{exercises.filter((item) => item.name).length} упражнений</small></div>
        </Card>
        <Card className="builder-list-card">
          <div className="section-heading"><div><span>Программа</span><h3>Упражнения</h3></div><span className="count-badge">{exercises.length}</span></div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={exercises.map((item) => item.localId)} strategy={verticalListSortingStrategy}>
              <div className="builder-exercises">
                {exercises.map((item, index) => <SortableExercise key={item.localId} item={item} index={index} onChange={(patch) => setExercises((current) => current.map((value) => value.localId === item.localId ? { ...value, ...patch } : value))} onDelete={() => setExercises((current) => current.filter((value) => value.localId !== item.localId))} />)}
              </div>
            </SortableContext>
          </DndContext>
          <button className="add-exercise-button" onClick={addExercise}><Plus size={18} /><div><strong>Добавить упражнение</strong><span>Введи любое название</span></div></button>
          <div className="builder-save-footer">
            <div><span>Всё готово?</span><strong>Сохрани тренировку после добавления всех упражнений</strong></div>
            <Button size="lg" icon={<Check size={17} />} loading={saving} onClick={handleSave}>Сохранить</Button>
          </div>
        </Card>
      </div>
    </motion.div>
  )
}
