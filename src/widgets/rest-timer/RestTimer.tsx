import { useEffect, useRef, useState } from 'react'
import { Minus, Pause, Plus, TimerReset, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useRestTimer } from '../../features/rest-timer/useRestTimer'
import { formatTimer } from '../../utils/format'
import { Button } from '../../components/ui/Button'

function playFinishedSound() {
  try {
    const context = new AudioContext()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.frequency.setValueAtTime(660, context.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.18)
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.45)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.45)
  } catch {
    // Audio is a progressive enhancement.
  }
}

export function RestTimer() {
  const { endsAt, duration, visible, add, stop, hide } = useRestTimer()
  const [remaining, setRemaining] = useState(0)
  const notified = useRef(false)

  useEffect(() => {
    if (!endsAt) return
    notified.current = false
    const update = () => {
      const next = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      setRemaining(next)
      if (next === 0 && !notified.current) {
        notified.current = true
        playFinishedSound()
      }
    }
    update()
    const interval = window.setInterval(update, 250)
    return () => window.clearInterval(interval)
  }, [endsAt])

  const progress = duration ? Math.min(1, Math.max(0, remaining / duration)) : 0

  return (
    <AnimatePresence>
      {visible && endsAt && (
        <motion.aside className={`rest-timer ${remaining === 0 ? 'rest-timer--done' : ''}`} initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.96 }}>
          <div className="rest-timer__ring" style={{ '--progress': progress } as React.CSSProperties}>
            <TimerReset size={19} />
          </div>
          <div className="rest-timer__content"><span>{remaining ? 'Отдых' : 'Время вышло'}</span><strong>{formatTimer(remaining)}</strong></div>
          <div className="rest-timer__controls">
            <Button variant="ghost" size="icon" onClick={() => add(-15)} aria-label="Убрать 15 секунд"><Minus size={16} /></Button>
            <Button variant="ghost" size="icon" onClick={stop} aria-label="Остановить"><Pause size={16} /></Button>
            <Button variant="ghost" size="icon" onClick={() => add(15)} aria-label="Добавить 15 секунд"><Plus size={16} /></Button>
            <Button variant="ghost" size="icon" onClick={hide} aria-label="Скрыть"><X size={16} /></Button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
