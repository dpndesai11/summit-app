import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthGate, ErrorBoundary } from '@summit/core'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthGate title="Summit" subtitle="Finance">
        <App />
      </AuthGate>
    </ErrorBoundary>
  </StrictMode>,
)
