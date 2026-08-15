import { Link, useNavigate } from 'react-router-dom'
import { db } from '../../db/db'
import { startCardioSession, ValidationError } from '../../db/repos'
import { exerciseCategoryNames } from '../../lib/days'
import {
  useActiveSession,
  useCardioExercises,
  useCategoryMap,
  useSessionEntries,
  useSessionSummaries,
} from '../../lib/hooks'
import { buildWeekTrack, currentStreak } from '../../lib/week'
import { useActiveGym } from '../../state/activeGym'
import { TabBar } from '../../ui/Chrome'
import { useToast } from '../../ui/Feedback'
import { Icon } from '../../ui/Icon'
import { Media } from '../../ui/Media'
import { WeeklySummary } from '../../ui/WeeklySummary'
import './cardio.css'

/**
 * The Cardio tab: the loose half of training.
 *
 * No days and no accordion, deliberately. Strength is a routine — Dia 1 chest,
 * Dia 2 back — and Home models that. Cardio is not: you do 30 minutes on the
 * treadmill because you felt like it, so it starts from the **exercise**, and
 * every row carries its own Iniciar.
 *
 * No weight anywhere either: a cardio exercise has none, so there is no badge
 * and no "definir" prompt to show.
 */
export function CardioPage() {
  const exercises = useCardioExercises()
  const catMap = useCategoryMap()
  const summaries = useSessionSummaries()
  const activeGymId = useActiveGym((s) => s.activeGymId)
  const activeSession = useActiveSession(activeGymId)
  // Which exercise the running cardio is on, so its row can offer "Continuar".
  // Without this the session is unreachable: a cardio has no `dayId`, so Home
  // has no card to resume from, and every Iniciar here would just say "busy".
  const runningEntries = useSessionEntries(
    activeSession?.kind === 'cardio' ? (activeSession.id ?? null) : null,
  )
  const runningExerciseId =
    activeSession?.kind === 'cardio' ? runningEntries?.[0]?.exerciseId : undefined
  const toast = useToast()
  const nav = useNavigate()

  const onStart = async (exerciseId: number) => {
    if (activeGymId == null) {
      toast('Crie ou selecione uma academia primeiro.')
      return
    }
    // `undefined` is "still loading" — starting now could open a second session.
    if (activeSession === undefined) return
    if (activeSession) {
      // Whatever row was tapped, the only thing to do is go to the session that
      // is already running — this screen is the one place it can be reached.
      if (exerciseId !== runningExerciseId) toast('Você já tem um treino em andamento.')
      nav(`/session/${activeSession.id}`)
      return
    }
    try {
      const id = await startCardioSession(activeGymId, exerciseId, db)
      nav(`/session/${id}`)
    } catch (e) {
      toast(e instanceof ValidationError ? e.message : 'Não foi possível iniciar.')
    }
  }

  const blocked = activeSession != null

  // The same week the Treinos tab shows, counting the same thing: a cardio is a
  // workout everywhere else in the app, so a cardio-only number here would be
  // the one place disagreeing. `null` until the history answers — deriving from
  // `[]` would paint "0 / 7 treinos" and correct itself a frame later.
  const now = Date.now()
  const weekCells = summaries
    ? buildWeekTrack(
        summaries.map((s) => s.session.completedAt ?? 0).filter((ts) => ts > 0),
        now,
      )
    : null
  const streak = weekCells ? currentStreak(weekCells, now) : 0

  return (
    <>
      <header className="appbar">
        <h1>Cardio</h1>
      </header>
      <main className="screen">
        {/* Nothing is claimed until the list has actually been read — an empty
            state shown while loading is a lie (see app-foundation). */}
        {exercises === undefined ? null : exercises.length === 0 ? (
          <div className="empty">
            <span className="big">🏃</span>
            <h2>Nenhum cardio ainda</h2>
            <p>
              Cadastre um exercício do tipo <strong>Cardio</strong> — esteira, bike, elíptico — e
              ele aparece aqui, pronto para iniciar.
            </p>
            <Link className="btn primary" to="/settings/exercises/new">
              <Icon name="plus" /> Novo exercício
            </Link>
          </div>
        ) : (
          <>
            {weekCells && <WeeklySummary cells={weekCells} streak={streak} />}
            <ul className="cardio-list">
            {exercises.map((e) => {
              const cats = exerciseCategoryNames(e, catMap)
              const running = e.id === runningExerciseId
              return (
                <li key={e.id} className={`cardio-row${running ? ' running' : ''}`}>
                  <Link className="cardio-link" to={`/exercise/${e.id}`}>
                    <Media className="thumb" url={e.mediaUrl} alt={e.name} />
                    <span className="cardio-body">
                      <span className="cardio-name">{e.name}</span>
                      {cats.length > 0 && <span className="cardio-cat">{cats.join(' · ')}</span>}
                    </span>
                  </Link>
                  {/* aria-disabled, not `disabled`: a disabled button receives no
                      events at all, so on a phone it is indistinguishable from a
                      hung app. This one still explains itself when tapped —
                      the same call the Home day cards make. */}
                  <button
                    className={`cardio-start${running ? ' resume' : blocked ? ' blocked' : ''}`}
                    aria-label={running ? `Continuar ${e.name}` : `Iniciar ${e.name}`}
                    aria-disabled={(blocked && !running) || undefined}
                    onClick={() => onStart(e.id!)}
                  >
                    <i className="png-ic pi-play" aria-hidden />
                    <span className="cardio-start-lab">{running ? 'Continuar' : 'Iniciar'}</span>
                  </button>
                </li>
              )
            })}
            </ul>
          </>
        )}
      </main>
      <TabBar active="cardio" />
    </>
  )
}
