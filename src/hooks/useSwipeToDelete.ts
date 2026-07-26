import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

const DELETE_THRESHOLD = 72
const MAX_OFFSET = 104

export function useSwipeToDelete(onDelete: () => void) {
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)
  const horizontalGesture = useRef(false)
  const [offset, setOffset] = useState(0)

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (!event.isPrimary) return
    startX.current = event.clientX
    startY.current = event.clientY
    horizontalGesture.current = false
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (startX.current === null || startY.current === null) return
    const deltaX = event.clientX - startX.current
    const deltaY = event.clientY - startY.current
    if (!horizontalGesture.current && Math.abs(deltaY) > Math.abs(deltaX)) return
    if (deltaX >= 0) {
      setOffset(0)
      return
    }
    horizontalGesture.current = true
    setOffset(Math.max(-MAX_OFFSET, deltaX))
  }

  function finishGesture() {
    const shouldDelete = offset <= -DELETE_THRESHOLD
    startX.current = null
    startY.current = null
    horizontalGesture.current = false
    setOffset(0)
    if (shouldDelete) onDelete()
  }

  return {
    offset,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finishGesture,
      onPointerCancel: finishGesture,
    },
  }
}
