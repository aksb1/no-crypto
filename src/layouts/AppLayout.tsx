import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'wouter'
import { Sidebar } from '../widgets/navigation/Sidebar'
import { Topbar } from '../widgets/navigation/Topbar'
import { RestTimer } from '../widgets/rest-timer/RestTimer'
import { ActiveWorkoutDock } from '../widgets/active-workout/ActiveWorkoutDock'

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation()
  const isWorkoutMode = location.startsWith('/session/')

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location])

  return (
    <div className={`app-shell ${isWorkoutMode ? 'app-shell--focus' : ''}`}>
      <Sidebar compact={isWorkoutMode} />
      <div className="app-main">
        <Topbar />
        <main className="page-content">{children}</main>
      </div>
      <RestTimer />
      {!isWorkoutMode && <ActiveWorkoutDock />}
    </div>
  )
}
