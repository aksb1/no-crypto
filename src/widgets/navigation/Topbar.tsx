import { CalendarDays, Command, HardDrive } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

export function Topbar() {
  return (
    <header className="topbar">
      <div className="topbar__date"><CalendarDays size={16} />{format(new Date(), 'EEEE, d MMMM', { locale: ru })}</div>
      <div className="topbar__actions">
        <div className="save-state"><HardDrive size={15} /><span>Все изменения сохранены</span></div>
        <button className="command-button" aria-label="Быстрые действия"><Command size={16} /><kbd>⌘ K</kbd></button>
      </div>
    </header>
  )
}
