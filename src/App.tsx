import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useActiveGym } from './state/activeGym'
import { FeedbackProvider } from './ui/Feedback'
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

export function App() {
  const reconcile = useActiveGym((s) => s.reconcile)

  useEffect(() => {
    void reconcile()
  }, [reconcile])

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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </FeedbackProvider>
  )
}
