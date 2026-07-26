import type { ReactNode } from 'react'
import { Card } from './Card'

interface MetricCardProps {
  label: string
  value: string
  detail?: string
  icon: ReactNode
  accent?: 'blue' | 'violet' | 'green' | 'orange'
}

export function MetricCard({ label, value, detail, icon, accent = 'blue' }: MetricCardProps) {
  return (
    <Card className={`metric-card metric-card--${accent}`}>
      <div className="metric-card__top">
        <span>{label}</span>
        <div className="metric-card__icon">{icon}</div>
      </div>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </Card>
  )
}
