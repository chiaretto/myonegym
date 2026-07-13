import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { db } from './db/db'
import { hasAnyRegisteredData } from './db/repos'
import { generateExample } from './data/portability'
import { useActiveGym } from './state/activeGym'
import { useOnboarding } from './state/onboarding'
import { applyFontScale, useSettings } from './state/settings'
import { FeedbackProvider } from './ui/Feedback'
import { Sheet } from './ui/Sheet'
import { HomePage } from './features/home/HomePage'
import { ExerciseDetailPage } from './features/exercise/ExerciseDetailPage'
import { SessionPage } from './features/session/SessionPage'
import { SessionEntryPage } from './features/session/SessionEntryPage'
import { SessionsPage } from './features/session/SessionsPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { GymsPage } from './features/settings/GymsPage'
import { CategoriesPage } from './features/settings/CategoriesPage'
import { ExercisesPage } from './features/settings/ExercisesPage'
import { DaysPage } from './features/settings/DaysPage'
import { DataPage } from './features/settings/DataPage'
import { AppearancePage } from './features/settings/AppearancePage'

export function App() {
  const reconcile = useActiveGym((s) => s.reconcile)
  const fontScale = useSettings((s) => s.fontScale)
  const markPromptSeen = useOnboarding((s) => s.markPromptSeen)
  const [showExamplePrompt, setShowExamplePrompt] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    void (async () => {
      await reconcile()
      // Decide the first-launch prompt only once, after the initial load. A
      // device that already had data before this feature shipped is treated
      // as already-asked instead of retroactively prompted.
      if (useOnboarding.getState().hasSeenExamplePrompt) return
      if (await hasAnyRegisteredData(db)) {
        markPromptSeen()
      } else {
        setShowExamplePrompt(true)
      }
    })()
  }, [reconcile, markPromptSeen])

  // Apply the user's font-size preference live whenever it changes.
  useEffect(() => {
    applyFontScale(fontScale)
  }, [fontScale])

  const onAcceptExample = async () => {
    setGenerating(true)
    try {
      await generateExample(db)
      await reconcile()
    } finally {
      setGenerating(false)
      markPromptSeen()
      setShowExamplePrompt(false)
    }
  }

  const onDeclineExample = () => {
    markPromptSeen()
    setShowExamplePrompt(false)
  }

  return (
    <FeedbackProvider>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/exercise/:id" element={<ExerciseDetailPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/session/:id" element={<SessionPage />} />
          <Route path="/session/:id/entry/:entryId" element={<SessionEntryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/gyms" element={<GymsPage />} />
          <Route path="/settings/categories" element={<CategoriesPage />} />
          <Route path="/settings/exercises" element={<ExercisesPage />} />
          <Route path="/settings/days" element={<DaysPage />} />
          <Route path="/settings/data" element={<DataPage />} />
          <Route path="/settings/appearance" element={<AppearancePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {showExamplePrompt && (
          <Sheet title="Bem-vindo ao MyOneGym" onClose={onDeclineExample}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Quer começar com um exemplo pronto — categorias, exercícios e dias de treino — para
              conhecer o app? Você pode gerar isso depois em Configurações → Backup.
            </p>
            <div className="sheet-actions">
              <button className="btn subtle" onClick={onDeclineExample} disabled={generating}>
                Começar do zero
              </button>
              <button
                className="btn primary"
                onClick={() => void onAcceptExample()}
                disabled={generating}
              >
                Carregar exemplo
              </button>
            </div>
          </Sheet>
        )}
      </div>
    </FeedbackProvider>
  )
}
