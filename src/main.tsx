import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/main.scss'
import App from './App.tsx'

import * as serviceWorkerRegistration from './registerServiceWorker'

// Register service worker for PWA support
serviceWorkerRegistration.register()



// Render app directly; Firestore sync handled after authentication in Layout
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
