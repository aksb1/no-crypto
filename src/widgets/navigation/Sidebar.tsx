import { BarChart3, ChartNoAxesCombined, Dumbbell, House, PanelLeftClose, Settings } from 'lucide-react'
import { Link, useLocation } from 'wouter'

const navigation = [
  { to: '/', label: 'Dashboard', icon: House, end: true },
  { to: '/workouts', label: 'Тренировки', icon: Dumbbell },
  { to: '/statistics', label: 'Статистика', icon: BarChart3 },
  { to: '/charts', label: 'Графики', icon: ChartNoAxesCombined },
  { to: '/settings', label: 'Настройки', icon: Settings },
]

export function Sidebar({ compact }: { compact?: boolean }) {
  const [location] = useLocation()
  return (
    <aside className={`sidebar ${compact ? 'sidebar--compact' : ''}`}>
      <div className="brand">
        <div className="brand__mark">F</div>
        <div className="brand__text"><strong>Forma</strong><span>training journal</span></div>
      </div>
      <nav className="sidebar__nav">
        <div className="sidebar__label">Workspace</div>
        {navigation.map(({ to, label, icon: Icon, end }) => {
          const isActive = end ? location === to : location.startsWith(to)
          return <Link key={to} href={to} className={`nav-item ${isActive ? 'nav-item--active' : ''}`}>
            <Icon size={19} strokeWidth={1.8} />
            <span>{label}</span>
          </Link>
        })}
      </nav>
      <div className="sidebar__bottom">
        <div className="local-status"><i /><div><strong>Локально</strong><span>Данные защищены</span></div></div>
        <button className="collapse-button" aria-label="Свернуть меню"><PanelLeftClose size={18} /></button>
      </div>
    </aside>
  )
}
