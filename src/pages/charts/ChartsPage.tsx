import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'motion/react'
import { endOfWeek, format, startOfWeek, subWeeks } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Activity, Dumbbell, TrendingUp } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { db } from '../../storage/database/db'
import { getExerciseStats } from '../../storage/repositories/workoutRepository'
import { Chart } from '../../components/charts/Chart'

const baseTooltip = { trigger: 'axis', backgroundColor: '#121622', borderColor: 'rgba(255,255,255,.1)', textStyle: { color: '#fff' }, padding: 12 }
const axisStyle = { axisLine: { lineStyle: { color: 'rgba(255,255,255,.08)' } }, axisTick: { show: false }, axisLabel: { color: '#747b90', fontSize: 11 } }

export function ChartsPage() {
  const stats = useLiveQuery(getExerciseStats, [])
  const [selectedId, setSelectedId] = useState('')
  useEffect(() => { if (!selectedId && stats?.[0]) setSelectedId(stats[0].exercise.id) }, [selectedId, stats])

  const data = useLiveQuery(async () => {
    const sessions = (await db.sessions.where('status').equals('completed').toArray()).sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? ''))
    const weekly = Array.from({ length: 12 }, (_, index) => {
      const start = startOfWeek(subWeeks(new Date(), 11 - index), { weekStartsOn: 1 })
      const end = endOfWeek(start, { weekStartsOn: 1 })
      const selected = sessions.filter((session) => {
        const date = new Date(session.completedAt ?? session.startedAt)
        return date >= start && date <= end
      })
      return { label: format(start, 'd MMM', { locale: ru }), count: selected.length, volume: selected.reduce((sum, session) => sum + session.totalVolume, 0) }
    })
    if (!selectedId) return { weekly, progress: [] }
    const exerciseLinks = await db.sessionExercises.where('exerciseId').equals(selectedId).toArray()
    const progress = (await Promise.all(exerciseLinks.map(async (link) => {
      const session = sessions.find((item) => item.id === link.sessionId)
      if (!session) return null
      const sets = (await db.sets.where('sessionExerciseId').equals(link.id).toArray()).filter((set) => set.completed)
      if (!sets.length) return null
      return { date: session.completedAt ?? session.startedAt, maxWeight: Math.max(...sets.map((set) => set.weight ?? 0)), volume: sets.reduce((sum, set) => sum + (set.weight ?? 0) * (set.repetitions ?? 0), 0) }
    }))).filter((row): row is NonNullable<typeof row> => Boolean(row)).sort((a, b) => a.date.localeCompare(b.date))
    return { weekly, progress }
  }, [selectedId])

  const selectedName = useMemo(() => stats?.find((item) => item.exercise.id === selectedId)?.exercise.name, [stats, selectedId])
  const hasData = Boolean(stats?.length)

  return (
    <motion.div className="page" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <PageHeader eyebrow="Progress lab" title="Графики" description="Динамика силы, объёма и регулярности в интерактивном виде." actions={hasData ? <label className="exercise-select"><span>Упражнение</span><select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{stats?.map((item) => <option key={item.exercise.id} value={item.exercise.id}>{item.exercise.name}</option>)}</select></label> : undefined} />
      {!hasData ? <EmptyState title="Для графиков нужны данные" description="После первой завершённой тренировки здесь появится динамика прогресса." /> : <div className="charts-grid">
        <Card className="chart-card chart-card--wide"><div className="section-heading"><div><span><TrendingUp size={14} />Прогресс силы</span><h3>{selectedName}</h3></div><div className="legend"><i />Рабочий вес</div></div><Chart height={330} option={{ animationDuration: 750, grid: { left: 12, right: 16, top: 35, bottom: 25, containLabel: true }, tooltip: baseTooltip, xAxis: { type: 'category', boundaryGap: false, data: data?.progress.map((row) => format(new Date(row.date), 'd MMM', { locale: ru })), ...axisStyle }, yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(255,255,255,.055)' } }, ...axisStyle }, series: [{ name: 'Вес', type: 'line', smooth: 0.35, symbol: 'circle', symbolSize: 8, data: data?.progress.map((row) => row.maxWeight), lineStyle: { width: 3, color: '#6d8cff' }, itemStyle: { color: '#8b9dff', borderColor: '#10131e', borderWidth: 3 }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(109,140,255,.32)' }, { offset: 1, color: 'rgba(109,140,255,0)' }] } } }] }} /></Card>
        <Card className="chart-card"><div className="section-heading"><div><span><Activity size={14} />Нагрузка</span><h3>Объём по неделям</h3></div></div><Chart height={270} option={{ animationDuration: 700, grid: { left: 8, right: 8, top: 28, bottom: 22, containLabel: true }, tooltip: baseTooltip, xAxis: { type: 'category', data: data?.weekly.map((row) => row.label), ...axisStyle, axisLabel: { color: '#747b90', fontSize: 10, interval: 2 } }, yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(255,255,255,.055)' } }, ...axisStyle }, series: [{ name: 'Объём', type: 'bar', data: data?.weekly.map((row) => row.volume), barWidth: 13, itemStyle: { color: '#815cff', borderRadius: [6, 6, 2, 2] } }] }} /></Card>
        <Card className="chart-card"><div className="section-heading"><div><span><Dumbbell size={14} />Регулярность</span><h3>Тренировки в неделю</h3></div></div><Chart height={270} option={{ animationDuration: 700, grid: { left: 8, right: 8, top: 28, bottom: 22, containLabel: true }, tooltip: baseTooltip, xAxis: { type: 'category', data: data?.weekly.map((row) => row.label), ...axisStyle, axisLabel: { color: '#747b90', fontSize: 10, interval: 2 } }, yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: 'rgba(255,255,255,.055)' } }, ...axisStyle }, series: [{ name: 'Тренировки', type: 'line', smooth: true, data: data?.weekly.map((row) => row.count), lineStyle: { width: 3, color: '#43d6a0' }, symbolSize: 7, itemStyle: { color: '#43d6a0' }, areaStyle: { color: 'rgba(67,214,160,.12)' } }] }} /></Card>
      </div>}
    </motion.div>
  )
}
