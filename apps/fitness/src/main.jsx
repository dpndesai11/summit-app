import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthGate, ErrorBoundary } from '@summit/core'
import './index.css'
import { applyAccent, readAccent } from './lib/accent'
import App from './App.jsx'

// Set the chosen colour before the first paint.
applyAccent(readAccent())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthGate title="Summit" subtitle="Fitness">
        <App />
      </AuthGate>
    </ErrorBoundary>
  </StrictMode>,
)
