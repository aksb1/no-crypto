import { useRef, useState, type UIEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'motion/react'
import { Activity, CalendarCheck, Clock3, Dumbbell, Plus, Sparkles } from 'lucide-react'
import { Link } from 'wouter'
import { startOfWeek } from 'date-fns'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { MetricCard } from '../../components/ui/MetricCard'
import { PageHeader } from '../../components/ui/PageHeader'
import { WorkoutHistoryRow } from '../../components/workouts/WorkoutHistoryRow'
import { useWorkoutStart } from '../../features/workout-session/WorkoutStartProvider'
import { listCompletedSessions, listTemplateDetails } from '../../storage/repositories/workoutRepository'
import { formatCompact, formatRelative } from '../../utils/format'

export function DashboardPage() {
  const startWorkout = useWorkoutStart()
  const templates = useLiveQuery(listTemplateDetails, [])
  const sessions = useLiveQuery(() => listCompletedSessions(), [])
  const [activeTemplate, setActiveTemplate] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)
  const lastSession = sessions?.[0]
  const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weeklySessions = sessions?.filter((session) => new Date(session.completedAt ?? session.startedAt) >= thisWeekStart) ?? []
  const weeklyVolume = weeklySessions.reduce((sum, session) => sum + session.totalVolume, 0)

  function handleCarouselScroll(event: UIEvent<HTMLDivElement>) {
    const width = event.currentTarget.clientWidth
    if (!width) return
    setActiveTemplate(Math.min((templates?.length ?? 1) - 1, Math.max(0, Math.round(event.currentTarget.scrollLeft / width))))
  }

  function showTemplate(index: number) {
    carouselRef.current?.scrollTo({ left: carouselRef.current.clientWidth * index, behavior: 'smooth' })
    setActiveTemplate(index)
  }

  return (
    <motion.div className="page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Overview" title="Добро пожаловать" description="Всё важное о твоих тренировках — в одном спокойном пространстве." />

      {!templates?.length ? (
        <EmptyState title="Начнём с первой тренировки" description="Создай шаблон с нужными упражнениями и запускай его в одно касание." action={<Link href="/workouts/new"><Button size="lg" icon={<Plus size={18} />}>Создать тренировку</Button></Link>} />
      ) : (
        <>
          <section className="today-carousel" aria-label="Выбор тренировки для быстрого старта">
            <div ref={carouselRef} className="today-carousel__track" onScroll={handleCarouselScroll}>
              {templates.map((template) => (
                <Card glow className="today-card today-carousel__slide" key={template.id}>
                  <div className="today-card__ambient" style={{ color: template.accent }} />
                  <div className="today-card__content">
                    <div className="status-pill"><i />Готова к старту</div>
                    <div>
                      <span className="card-kicker">Выбранная тренировка</span>
                      <h2>{template.name}</h2>
                      <p>{template.exercises.map((item) => item.exercise.name).slice(0, 3).join(' · ')}</p>
                    </div>
                    <div className="today-card__meta">
                      <span><Dumbbell size={16} />{template.exercises.length} упражнений</span>
                      <span><Clock3 size={16} />≈ {Math.max(30, template.exercises.length * 10)} мин</span>
                    </div>
                    <Button size="lg" onClick={() => startWorkout({ id: template.id, name: template.name })} icon={<Sparkles size={18} />}>Начать тренировку</Button>
                  </div>
                </Card>
              ))}
            </div>
            {templates.length > 1 && <div className="today-carousel__dots" aria-label="Тренировки">{templates.map((template, index) => <button key={template.id} className={index === activeTemplate ? 'active' : ''} onClick={() => showTemplate(index)} aria-label={`Показать ${template.name}`} />)}</div>}
          </section>

          <section className="dashboard-last">
            <div className="section-heading"><div><span>Последняя тренировка</span><h3>{lastSession ? 'Последний результат' : 'История пока пуста'}</h3></div></div>
            {lastSession ? <WorkoutHistoryRow session={lastSession} className="dashboard-history-row" /> : <Card className="dashboard-history-empty"><span>Заверши первую тренировку — здесь появится её результат.</span></Card>}
          </section>

          <section className="metrics-grid metrics-grid--dashboard">
            <MetricCard label="Тренировок" value={String(sessions?.length ?? 0)} detail="за всё время" icon={<CalendarCheck size={19} />} />
            <MetricCard label="Объём недели" value={`${formatCompact(weeklyVolume)} кг`} detail={`${weeklySessions.length} тренировок`} icon={<Activity size={19} />} accent="violet" />
            <MetricCard label="Последний объём" value={`${formatCompact(lastSession?.totalVolume ?? 0)} кг`} detail={lastSession ? formatRelative(lastSession.completedAt) : 'нет данных'} icon={<Dumbbell size={19} />} accent="green" />
          </section>
        </>
      )}
    </motion.div>
  )
}
