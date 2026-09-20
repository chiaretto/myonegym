import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@tabler/icons-webfont/dist/tabler-icons.min.css'
import './styles/fonts.css'
import './styles/global.css'
import { App } from './App'
import { maintainPhotoStorage } from './db/repos'
import { initAppUpdate } from './lib/appUpdate'
import { initGoogleAuth } from './lib/googleAuth'
import { scheduleBootSplashDismissal } from './lib/bootSplash'
import { initInstall } from './lib/install'
import { requestPersistentStorage } from './lib/storage'
import { useGoogleAccount } from './state/googleAccount'
import { applyAccent, applyFontScale, useSettings } from './state/settings'

// Apply the saved font size and accent colour BEFORE first paint so the app
// never flashes the defaults before the user's preferences apply.
// zustand+persist rehydrates synchronously from localStorage, so getState()
// already holds the stored values.
applyFontScale(useSettings.getState().fontScale)
applyAccent(useSettings.getState().accent)

// Also before first render: `beforeinstallprompt` fires early and only once, so
// a listener mounted later (e.g. by the Settings screen) would never see it and
// the in-app install button could never appear.
initInstall()

// Registers the service worker — the app does it itself so that Settings can
// hold the registration and check for a new version on demand (see
// lib/appUpdate). Also starts the silent check that runs whenever the app comes
// back to the foreground, which is what an installed PWA never gets from a
// navigation.
initAppUpdate()

// A sign-in coming back from Google is a fresh boot with the token in the URL
// fragment. It has to be read — and scrubbed — before anything renders or can
// see it; the URL is rewritten to the screen the user left, so the router
// below boots straight onto it (see lib/googleAuth).
initGoogleAuth(useGoogleAccount.getState().profile?.email)

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
