import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@tabler/icons-webfont/dist/tabler-icons.min.css'
import './styles/fonts.css'
import './styles/global.css'
import { App } from './App'
import { requestPersistentStorage } from './lib/storage'
import { applyFontScale, useSettings } from './state/settings'

// Apply the saved font size BEFORE first paint so the app never flashes the
// default before the user's preference applies. zustand+persist rehydrates
// synchronously from localStorage, so getState() already holds the stored value.
applyFontScale(useSettings.getState().fontScale)

// Best-effort: ask the browser to keep our IndexedDB data around.
void requestPersistentStorage()

// BASE_URL is "/" in dev and "/myonegym/" in the GitHub Pages build.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
