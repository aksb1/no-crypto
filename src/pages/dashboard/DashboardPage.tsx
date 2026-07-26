import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'motion/react'
import { Activity, ArrowRight, CalendarCheck, Clock3, Dumbbell, Flame, Plus, Sparkles, Trophy } from 'lucide-react'
import { Link, useLocation } from 'wouter'
import { endOfWeek, format, startOfWeek, subWeeks } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { MetricCard } from '../../components/ui/MetricCard'
import { PageHeader } from '../../components/ui/PageHeader'
import { listCompletedSessions, listTemplateDetails, startSession } from '../../storage/repositories/workoutRepository'
import { formatCompact, formatDate, formatDuration, formatRelative } from '../../utils/format'
import { Chart } from '../../components/charts/Chart'

export function DashboardPage() {
  const [, navigate] = useLocation()
  const templates = useLiveQuery(listTemplateDetails, [])
  const sessions = useLiveQuery(() => listCompletedSessions(), [])
  const lastSession = sessions?.[0]
  const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weeklySessions = sessions?.filter((session) => new Date(session.completedAt ?? session.startedAt) >= thisWeekStart) ?? []
  const weeklyVolume = weeklySessions.reduce((sum, session) => sum + session.totalVolume, 0)

  const activity = Array.from({ length: 10 }, (_, index) => {
    const start = startOfWeek(subWeeks(new Date(), 9 - index), { weekStartsOn: 1 })
    const end = endOfWeek(start, { weekStartsOn: 1 })
    const count = sessions?.filter((session) => {
      const date = new Date(session.completedAt ?? session.startedAt)
      return date >= start && date <= end
    }).length ?? 0
    return { label: format(start, 'd MMM', { locale: ru }), count }
  })

  const startWorkout = async (templateId: string) => {
    const sessionId = await startSession(templateId)
    navigate(`/session/${sessionId}`)
  }

  return (
    <motion.div className="page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Overview" title="Добро пожаловать" description="Всё важное о твоём прогрессе — в одном спокойном пространстве." />

      {!templates?.length ? (
        <EmptyState title="Начнём с первой тренировки" description="Создай шаблон один раз — дальше Forma будет помнить упражнения, веса и подходы за тебя." action={<Link href="/workouts/new"><Button size="lg" icon={<Plus size={18} />}>Создать тренировку</Button></Link>} />
      ) : (
        <>
          <section className="hero-grid">
            <Card glow className="today-card">
              <div className="today-card__ambient" />
              <div className="today-card__content">
                <div className="status-pill"><i />Готово к старту</div>
                <div>
                  <span className="card-kicker">Следующая тренировка</span>
                  <h2>{templates[0].name}</h2>
                  <p>{templates[0].exercises.map((item) => item.exercise.name).slice(0, 3).join(' · ')}</p>
                </div>
                <div className="today-card__meta">
                  <span><Dumbbell size={16} />{templates[0].exercises.length} упражнений</span>
                  <span><Clock3 size={16} />≈ {Math.max(30, templates[0].exercises.length * 10)} мин</span>
                </div>
                <Button size="lg" onClick={() => startWorkout(templates[0].id)} icon={<Sparkles size={18} />}>Начать тренировку</Button>
              </div>
            </Card>

            <Card className="last-workout-card">
              <div className="section-heading"><div><span>Последняя тренировка</span><h3>{lastSession?.templateNameSnapshot ?? 'История пока пуста'}</h3></div><div className="round-icon"><Trophy size={19} /></div></div>
              {lastSession ? (
                <>
                  <div className="last-workout-card__date">{formatDate(lastSession.completedAt)}</div>
                  <div className="last-workout-card__stats">
                    <div><strong>{formatCompact(lastSession.totalVolume)}</strong><span>объём, кг</span></div>
                    <div><strong>{formatDuration(lastSession.durationSeconds)}</strong><span>длительность</span></div>
                  </div>
                  <Link href="/workouts" className="text-link">Открыть историю <ArrowRight size={15} /></Link>
                </>
              ) : <p className="muted">Заверши первую тренировку — здесь появится её результат.</p>}
            </Card>
          </section>

          <section className="metrics-grid">
            <MetricCard label="Тренировок" value={String(sessions?.length ?? 0)} detail="за всё время" icon={<CalendarCheck size={19} />} />
            <MetricCard label="Объём недели" value={`${formatCompact(weeklyVolume)} кг`} detail={`${weeklySessions.length} тренировок`} icon={<Activity size={19} />} accent="violet" />
            <MetricCard label="Активность" value={`${weeklySessions.length} / нед`} detail="текущий темп" icon={<Flame size={19} />} accent="orange" />
            <MetricCard label="Последний объём" value={`${formatCompact(lastSession?.totalVolume ?? 0)} кг`} detail={lastSession ? formatRelative(lastSession.completedAt) : 'нет данных'} icon={<Dumbbell size={19} />} accent="green" />
          </section>

          <section className="dashboard-bottom-grid">
            <Card className="activity-card">
              <div className="section-heading"><div><span>Ритм тренировок</span><h3>Последние 10 недель</h3></div><div className="legend"><i />Тренировки</div></div>
              <Chart height={230} option={{
                animationDuration: 700,
                grid: { left: 5, right: 5, top: 24, bottom: 24, containLabel: true },
                xAxis: { type: 'category', data: activity.map((item) => item.label), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#6f7588', fontSize: 10, interval: 1 } },
                yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: 'rgba(255,255,255,.055)' } }, axisLabel: { show: false } },
                tooltip: { trigger: 'axis', backgroundColor: '#121622', borderColor: 'rgba(255,255,255,.1)', textStyle: { color: '#fff' } },
                series: [{ type: 'bar', data: activity.map((item) => item.count), barWidth: 16, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#6d8cff' }, { offset: 1, color: '#6146d7' }] }, borderRadius: [7, 7, 2, 2] } }],
              }} />
            </Card>
            <Card className="favorites-card">
              <div className="section-heading"><div><span>Быстрый старт</span><h3>Твои тренировки</h3></div><Link href="/workouts" className="icon-link"><ArrowRight size={17} /></Link></div>
              <div className="quick-workouts">
                {templates.slice(0, 4).map((template) => (
                  <button key={template.id} onClick={() => startWorkout(template.id)}>
                    <i style={{ background: template.accent }} />
                    <div><strong>{template.name}</strong><span>{template.exercises.length} упражнений</span></div>
                    <ArrowRight size={16} />
                  </button>
                ))}
              </div>
            </Card>
          </section>
        </>
      )}
    </motion.div>
  )
}
