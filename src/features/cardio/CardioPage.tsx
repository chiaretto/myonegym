import { Link, useNavigate } from 'react-router-dom'
import { db } from '../../db/db'
import {
  completeSession,
  deleteSession,
  listSessionEntries,
  startCardioSession,
  ValidationError,
} from '../../db/repos'
import { exerciseCategoryNames } from '../../lib/days'
import { busySessionMessage } from '../../lib/format'
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
import { useChoice, useToast } from '../../ui/Feedback'
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
  const choice = useChoice()
  const nav = useNavigate()

  const onStart = async (exerciseId: number) => {
    if (activeGymId == null) {
      toast('Crie ou selecione uma academia primeiro.')
      return
    }
    // `undefined` is "still loading" — starting now could open a second session.
    if (activeSession === undefined) return
    // Same reason, one level deeper: until the running cardio's entries are
    // known, no row can tell whether it is the one that owns the session, and
    // answering "you already have one" to its own Continuar would be a lie.
    if (activeSession?.kind === 'cardio' && runningEntries === undefined) return
    const go = async () => {
      try {
        // CHANGED: the session screen, not the exercise inside it. Skipping
        // straight to the entry saved a tap on a list of one, but it also meant
        // the session had no screen the user had ever seen — nothing to go back
        // to, nothing to resume to, and a whole set of cardio-only exceptions
        // downstream to keep that consistent. One shape for both kinds of workout
        // is worth the tap.
        const { sessionId } = await startCardioSession(activeGymId, exerciseId, db)
        nav(`/session/${sessionId}`)
      } catch (e) {
        toast(e instanceof ValidationError ? e.message : 'Não foi possível iniciar.')
      }
    }

    if (activeSession) {
      // A row that does NOT own the running session collides with it.
      //
      // CHANGED: it used to answer with a toast and stop there — the reason
      // alone, nothing to do about it. The same dialog Home uses now asks
      // instead, so the two screens answer the same collision the same way.
      // Reaching the session stays what its own "Continuar" is for; here it is
      // one of three ways out, named rather than assumed.
      if (exerciseId !== runningExerciseId) {
        const entries = await listSessionEntries(activeSession.id!, db)
        const doneCount = entries.filter((e) => e.done).length
        const target = exercises?.find((e) => e.id === exerciseId)?.name ?? 'o novo'
        const picked = await choice({
          title: busySessionMessage(activeSession.kind),
          message:
            `"${activeSession.dayName}" está em andamento, com ${doneCount} de ` +
            `${entries.length} ${entries.length === 1 ? 'exercício concluído' : 'exercícios concluídos'}. ` +
            'Só pode haver um treino em andamento por academia.',
          options: [
            {
              id: 'finish',
              label: `Concluir e iniciar "${target}"`,
              tone: 'primary',
              // The runner's own floor: a session with nothing marked cannot be
              // completed, only abandoned. Offering it would fail on tap.
              disabled: doneCount === 0,
              hint:
                doneCount === 0
                  ? 'Nada foi marcado como concluído ainda — descarte para iniciar outro.'
                  : undefined,
            },
            { id: 'resume', label: 'Voltar ao treino atual' },
            { id: 'discard', label: `Descartar "${activeSession.dayName}"`, tone: 'danger' },
          ],
        })
        if (picked === 'resume') nav(`/session/${activeSession.id}`)
        else if (picked === 'finish') {
          await completeSession(activeSession.id!, db)
          await go()
        } else if (picked === 'discard') {
          await deleteSession(activeSession.id!, db)
          await go()
        }
        return
      }
      // The running cardio's own row: back to the session, which is where
      // Iniciar led in the first place.
      nav(`/session/${activeSession.id}`)
      return
    }
    await go()
  }

  const blocked = activeSession != null

  // The same week the Treinos tab shows, counting the same thing: a cardio is a
  // workout everywhere else in the app, so a cardio-only number here would be
  // the one place disagreeing. `null` until the history answers — deriving from
  // `[]` would paint "0 / 7 treinos" and correct itself a frame later.
  const now = Date.now()
  const completed = (summaries ?? []).filter((s) => s.session.completedAt != null)
  // The star marks the day a cardio happened — the same mark, from the same
  // derivation, as the Treinos tab and the Consistência calendar. One widget,
  // one vocabulary.
  const cardioAt = completed
    .filter((s) => s.session.kind === 'cardio')
    .map((s) => s.session.completedAt!)
  const weekCells = summaries
    ? buildWeekTrack(
        completed.map((s) => s.session.completedAt!),
        now,
        cardioAt,
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
                  {/* The origin travels in the address: without it the detail
                      page cannot know it was opened from here, and Voltar falls
                      back to Home. */}
                  <Link className="cardio-link" to={`/exercise/${e.id}?from=cardio`}>
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
