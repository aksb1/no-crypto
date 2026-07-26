import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X } from 'lucide-react'
import { Button } from '../ui/Button'

export function PwaUpdatePrompt() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW()
  if (!needRefresh) return null
  return (
    <div className="update-toast">
      <div><strong>Доступно обновление</strong><span>Новая версия Forma готова.</span></div>
      <Button size="sm" icon={<RefreshCw size={15} />} onClick={() => updateServiceWorker(true)}>Обновить</Button>
      <Button size="icon" variant="ghost" onClick={() => setNeedRefresh(false)} aria-label="Позже"><X size={17} /></Button>
    </div>
  )
}
