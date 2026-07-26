import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '../ui/Button'

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Forma UI error', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <main className="fatal-error">
        <div className="fatal-error__icon"><AlertTriangle size={27} /></div>
        <h1>Интерфейс не загрузился</h1>
        <p>Тренировочные данные остаются в локальном хранилище. Перезагрузи приложение и продолжай работу.</p>
        <Button icon={<RefreshCw size={17} />} onClick={() => window.location.reload()}>Перезагрузить</Button>
      </main>
    )
  }
}
