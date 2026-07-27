import { CalendarDays } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { Card } from '../ui/Card'
import type { WorkoutSession } from '../../types/domain'
import { formatCompact, formatDateLong, formatDuration } from '../../utils/format'

export function WorkoutHistoryRow({ session, action, className = '', ...props }: {
  session: WorkoutSession
  action?: ReactNode
  className?: string
} & ComponentProps<typeof Card>) {
  const date = new Date(session.completedAt ?? session.startedAt)

  return (
    <Card className={`history-row ${action ? 'history-row--with-action' : ''} ${className}`.trim()} {...props}>
      <div className="history-row__date"><strong>{date.getDate()}</strong><span>{date.toLocaleString('ru', { month: 'short' })}</span></div>
      <div className="history-row__main"><h3>{session.templateNameSnapshot}</h3><span><CalendarDays size={14} />{formatDateLong(session.completedAt)}</span></div>
      <div className="history-row__metric"><strong>{formatCompact(session.totalVolume)} кг</strong><span>объём</span></div>
      <div className="history-row__metric"><strong>{formatDuration(session.durationSeconds)}</strong><span>время</span></div>
      {action && <div className="history-row__action">{action}</div>}
    </Card>
  )
}
