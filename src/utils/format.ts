import { format, formatDistanceToNowStrict, isToday, isYesterday } from 'date-fns'
import { ru } from 'date-fns/locale'

export function formatDate(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (isToday(date)) return 'Сегодня'
  if (isYesterday(date)) return 'Вчера'
  return format(date, 'd MMMM', { locale: ru })
}

export function formatDateLong(value?: string) {
  if (!value) return '—'
  return format(new Date(value), 'd MMMM yyyy', { locale: ru })
}

export function formatRelative(value?: string) {
  if (!value) return 'ещё не выполнялась'
  return formatDistanceToNowStrict(new Date(value), { addSuffix: true, locale: ru })
}

export function formatDuration(seconds?: number) {
  if (!seconds || seconds < 60) return '< 1 мин'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours ? `${hours} ч ${minutes} мин` : `${minutes} мин`
}

export function formatNumber(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits }).format(value)
}

export function formatCompact(value: number) {
  return new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

export function formatTimer(totalSeconds: number) {
  const seconds = Math.max(0, totalSeconds)
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
