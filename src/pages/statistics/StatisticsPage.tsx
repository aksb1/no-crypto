import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'motion/react'
import { Activity, CalendarCheck, Dumbbell, Gauge, Layers3, Sparkles, Trophy } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { MetricCard } from '../../components/ui/MetricCard'
import { PageHeader } from '../../components/ui/PageHeader'
import { getExerciseStats } from '../../storage/repositories/workoutRepository'
import { formatDateLong, formatNumber } from '../../utils/format'

export function StatisticsPage() {
  const stats = useLiveQuery(getExerciseStats, [])
  const [selectedId, setSelectedId] = useState('')

  useEffect(() => {
    if (!selectedId && stats?.[0]) setSelectedId(stats[0].exercise.id)
  }, [selectedId, stats])

  const selected = useMemo(() => stats?.find((item) => item.exercise.id === selectedId) ?? stats?.[0], [stats, selectedId])

  return (
    <motion.div className="page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Performance" title="Статистика" description="Чистые цифры по каждому упражнению — без лишнего шума." actions={stats?.length ? <label className="exercise-select"><span>Упражнение</span><select value={selected?.exercise.id} onChange={(event) => setSelectedId(event.target.value)}>{stats.map((item) => <option key={item.exercise.id} value={item.exercise.id}>{item.exercise.name}</option>)}</select></label> : undefined} />
      {!selected ? <EmptyState title="Статистика появится после тренировки" description="Заверши хотя бы одну тренировку с отмеченными подходами." /> : <>
        <Card glow className="stats-hero">
          <div className="stats-hero__ambient" />
          <div><span className="card-kicker">Выбранное упражнение</span><h2>{selected.exercise.name}</h2><p>За всё время · {selected.workoutCount} тренировок</p></div>
          <div className="stats-hero__record"><div className="round-icon"><Trophy size={22} /></div><span>Лучший вес</span><strong>{formatNumber(selected.bestWeight)} <small>кг</small></strong></div>
        </Card>
        <section className="metrics-grid stats-metrics">
          <MetricCard label="Общий объём" value={`${formatNumber(selected.totalVolume)} кг`} detail="за всё время" icon={<Activity size={19} />} />
          <MetricCard label="Лучший вес" value={`${formatNumber(selected.bestWeight)} кг`} detail="максимум в подходе" icon={<Trophy size={19} />} accent="violet" />
          <MetricCard label="Лучшие повторы" value={String(selected.bestRepetitions)} detail="в одном подходе" icon={<Sparkles size={19} />} accent="orange" />
          <MetricCard label="Тренировок" value={String(selected.workoutCount)} detail="с этим упражнением" icon={<CalendarCheck size={19} />} accent="green" />
          <MetricCard label="Подходов" value={String(selected.setCount)} detail="рабочих подходов" icon={<Layers3 size={19} />} />
          <MetricCard label="Средний вес" value={`${formatNumber(selected.averageWeight)} кг`} detail="среди рабочих" icon={<Gauge size={19} />} accent="violet" />
          <MetricCard label="Последний результат" value={selected.lastResult ? formatDateLong(selected.lastResult.date) : '—'} detail={`${selected.lastResult?.sets.length ?? 0} подходов`} icon={<Dumbbell size={19} />} accent="green" />
        </section>
        <Card className="last-result-card">
          <div className="section-heading"><div><span>Последняя тренировка</span><h3>{formatDateLong(selected.lastResult?.date)}</h3></div><div className="count-badge">{selected.lastResult?.sets.length ?? 0} подхода</div></div>
          <div className="result-sets">{selected.lastResult?.sets.map((set, index) => <div key={set.id}><span>{String(index + 1).padStart(2, '0')}</span><strong>{formatNumber(set.weight ?? 0)} кг</strong><i>×</i><strong>{set.repetitions ?? 0}</strong><small>{formatNumber((set.weight ?? 0) * (set.repetitions ?? 0))} кг объёма</small></div>)}</div>
        </Card>
      </>}
    </motion.div>
  )
}
