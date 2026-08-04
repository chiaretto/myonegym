import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@tabler/icons-webfont/dist/tabler-icons.min.css'
import './styles/fonts.css'
import './styles/global.css'
import { App } from './App'
import { maintainPhotoStorage } from './db/repos'
import { scheduleBootSplashDismissal } from './lib/bootSplash'
import { initInstall } from './lib/install'
import { requestPersistentStorage } from './lib/storage'
import { applyFontScale, useSettings } from './state/settings'

// Apply the saved font size BEFORE first paint so the app never flashes the
// default before the user's preference applies. zustand+persist rehydrates
// synchronously from localStorage, so getState() already holds the stored value.
applyFontScale(useSettings.getState().fontScale)

// Also before first render: `beforeinstallprompt` fires early and only once, so
// a listener mounted later (e.g. by the Settings screen) would never see it and
// the in-app install button could never appear.
initInstall()

// Best-effort: ask the browser to keep our IndexedDB data around.
void requestPersistentStorage()

// Also best-effort, and deliberately un-awaited: move photos that predate file
// storage out of the database, then drop image files no record points at. The
// first screen must not wait on either (see db/repos).
void maintainPhotoStorage()

// BASE_URL is "/" in dev and "/myonegym/" in the GitHub Pages build.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// Hand the boot splash in index.html over to the app now that there is a tree
// to reveal underneath it.
scheduleBootSplashDismissal()
