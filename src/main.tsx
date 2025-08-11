import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeDatabase } from './services/db'
import * as serviceWorkerRegistration from './registerServiceWorker'

// Register service worker for PWA support
serviceWorkerRegistration.register()

// Read the initial data from data.json
fetch('/data.json')
  .then((response) => response.json())
  .then((data) => {
    initializeDatabase(data)
      .then(() => {
        createRoot(document.getElementById('root')!).render(
          <StrictMode>
            <App />
          </StrictMode>,
        )
      })
      .catch((error) => {
        console.error('Failed to initialize database:', error)
      })
  })
  .catch((error) => {
    console.error('Failed to load initial data:', error)
  })
