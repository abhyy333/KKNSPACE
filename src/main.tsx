import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { CHUNK_RELOAD_STORAGE_KEY } from './lib/lazyWithRetry'

// Handle Vite dynamic import failure event gracefully
window.addEventListener('vite:preloadError', () => {
  try {
    if (!sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY)) {
      sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, Date.now().toString())
      console.warn('[KKN SPACE] vite:preloadError detected. Triggering single reload for updated assets.')
      window.location.reload()
    }
  } catch {
    // Fallback if sessionStorage is inaccessible
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
