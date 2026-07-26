import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}

export function Modal({ open, onClose, title, children, wide }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.section
            className={`modal ${wide ? 'modal--wide' : ''}`}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="modal__header">
              <h2>{title}</h2>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Закрыть"><X size={19} /></Button>
            </header>
            <div className="modal__body">{children}</div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
