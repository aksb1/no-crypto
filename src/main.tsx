import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Router } from 'wouter'
import { useHashLocation } from 'wouter/use-hash-location'
import App from './app/App'
import './app/styles/global.css'
import { AppErrorBoundary } from './components/feedback/AppErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary><Router hook={useHashLocation}><App /></Router></AppErrorBoundary>
  </StrictMode>,
)
