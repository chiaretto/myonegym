import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { db } from '../../db/db'
import { completeSession, setEntryDone, swapEntryExercise, ValidationError } from '../../db/repos'
import { useElapsed } from '../../lib/elapsed'
import { fmtClock } from '../../lib/format'
import {
  useCategoryMap,
  useExerciseMap,
  usePhotos,
  useSession,
  useSessionEntries,
  useSessionEntry,
} from '../../lib/hooks'
import { AlternativesSection } from '../exercise/AlternativesSection'
import { CategoryChips } from '../exercise/CategoryChips'
import { BackBar } from '../../ui/Chrome'
import { useConfirm, useToast } from '../../ui/Feedback'
import { exerciseCategoryNames } from '../../lib/days'
import { Icon } from '../../ui/Icon'
import { Media } from '../../ui/Media'
import { PhotoTab } from '../exercise/photo/PhotoTab'
import { StepperBar } from '../../ui/StepperBar'
import { Tabs } from '../../ui/Tabs'
import { NoteEditor } from '../exercise/NoteEditor'
import { VideosTab } from '../exercise/VideosTab'
import { WarmupButton } from '../warmup/WarmupButton'
import { WeightEditor } from '../exercise/WeightEditor'
import '../exercise/exercise.css'
import './session.css'

type EntryTab = 'exec' | 'notes' | 'videos' | 'photo'

export function SessionEntryPage() {
  const { id, entryId } = useParams()
  const sessionId = Number(id)
  const eId = Number(entryId)
  const session = useSession(sessionId)
  const entry = useSessionEntry(eId)
  const entries = useSessionEntries(sessionId)
  const exMap = useExerciseMap()
  const catMap = useCategoryMap()
  const nav = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()
  const [params] = useSearchParams()

  const [tab, setTab] = useState<EntryTab>('exec')

  // CHANGED: the session, whichever kind it is. A cardio used to go back to
  // /cardio instead, because Iniciar jumped straight here and the overview was
  // a list of one the user had never passed through. Now they do pass through
  // it, so back retraces the way in like everywhere else.
  const backTo = `/session/${sessionId}`
  // Cardio only: it is one exercise, so this screen is where the whole run is
  // spent and the clock belongs under the eyes that are on it. A strength entry
  // is a step the user passes through on the way to the next one, and its
  // runner — one tap up, and the screen they keep coming back to — has it.
  const showClock = session?.kind === 'cardio' && session.status === 'active'
  const elapsed = useElapsed(showClock && session ? session.startedAt : null)
  // Derived ABOVE the guards below, because `usePhotos` is a hook and a hook
  // may not sit behind an early return — React counts them by call order. The
  // ids are read defensively for that reason; the guards still decide whether
  // any of it gets rendered.
  const entryExercise = entry?.exerciseId != null ? exMap.get(entry.exerciseId) : undefined

  // Previewing one of the entry's alternatives, addressed as `?alt=`. The
  // preview stays INSIDE the session — the whole point of getting here is to
  // say "I did this one instead", which needs a session to act on. An `alt`
  // that is not (or is no longer) an alternative of the current exercise falls
  // back to the entry itself rather than showing something arbitrary.
  const altParam = Number(params.get('alt'))
  const previewing =
    Number.isInteger(altParam) && entryExercise?.alternativeIds?.includes(altParam)
      ? exMap.get(altParam)
      : undefined

  // Everything the screen shows follows the exercise being LOOKED AT; only the
  // done state and the stepper follow the entry.
  const exercise = previewing ?? entryExercise
  const shownId = previewing?.id ?? entry?.exerciseId ?? null
  // For the tab strip's count, of the exercise being SHOWN — the same one the
  // panel below would list. Undefined until it answers, so the strip shows
  // nothing rather than claiming zero.
  const photos = usePhotos(session?.gymId ?? null, shownId)

  // `entries` joins the wait: it drives the stepper, and an empty list would
  // render this exercise as the only one in the session.
  if (session === undefined || entry === undefined || entries === undefined)
    return <BackBar title="Exercício" to={backTo} />
  if (session === null || entry === null) {
    return (
      <>
        <BackBar title="Exercício" to={backTo} />
        <div className="empty">
          <p>Exercício da sessão não encontrado.</p>
        </div>
      </>
    )
  }

  const readOnly = session.status === 'completed'
  const shownName = previewing?.name ?? entry.exerciseName
  const catNames = exerciseCategoryNames(exercise, catMap)

  // Guided stepper over the session's exercises (in list order).
  const idx = entries.findIndex((e) => e.id === eId)
  const prevId = idx > 0 ? entries[idx - 1].id : undefined
  const nextId = idx >= 0 && idx < entries.length - 1 ? entries[idx + 1].id : undefined
  const goTo = (id: number) => nav(`/session/${sessionId}/entry/${id}`)
  const entryUrl = `/session/${sessionId}/entry/${eId}`

  const onSwap = async () => {
    if (readOnly || !previewing?.id) return
    try {
      await swapEntryExercise(eId, previewing.id, db)
      toast(`Agora este exercício é ${previewing.name}.`)
      nav(entryUrl, { replace: true })
    } catch (e) {
      toast(e instanceof ValidationError ? e.message : 'Não foi possível trocar o exercício.')
    }
  }

  const onCompleteAndAdvance = async () => {
    if (readOnly) return
    await setEntryDone(eId, true, db)
    if (nextId != null) {
      goTo(nextId)
      return
    }
    // Last exercise: when this completes the whole day, offer to finish the
    // workout; otherwise (some skipped) just return to the runner.
    const allDone = entries.every((e) => e.id === eId || e.done)
    if (allDone) {
      const ok = await confirm({
        title: 'Todos os exercícios concluídos!',
        message: 'Deseja concluir o treino?',
        confirmLabel: 'Concluir treino',
      })
      if (ok) {
        await completeSession(sessionId, db)
        toast('Treino concluído.')
        // The session's own screen, which on a completed session IS the summary
        // — with the share buttons. Same destination whichever kind of workout
        // this was, and whichever screen finished it.
        nav(`/session/${sessionId}`, { replace: true })
        return
      }
    }
    // Declined, or some entries skipped → back to the runner. A cardio has no
    // runner worth returning to (a list of one, never passed through), so it
    // simply stays on the exercise the user is looking at.
    if (session.kind !== 'cardio') nav(`/session/${sessionId}`)
  }

  return (
    <>
      {/* Previewing an alternative: Back returns to the entry, not to the
          runner — the user is one level deeper, not somewhere else. */}
      <BackBar title={shownName} to={previewing ? entryUrl : backTo} />
      <main className="screen has-action-bar">
        {/* Above the tabs: the ENTRY's status only — it is true on every tab,
            like the fixed bar at the bottom. No title (the name is in the top
            bar), no training day (chosen moments ago in the runner) and no
            categories: those describe the exercise and now read with the note.
            A previewed alternative doesn't claim the entry's "Concluído". */}
        {((entry.done && !previewing) || previewing) && (
          <div className="ex-head">
            <div className="ex-chips">
              {entry.done && !previewing && (
                <span className="chip accent">
                  <Icon name="check" size={12} /> Concluído
                </span>
              )}
              {previewing && (
                <span className="chip">
                  <Icon name="arrows-left-right" size={12} /> Alternativa de{' '}
                  {entryExercise?.name ?? entry.exerciseName}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Above the tabs, like the status chip: how long this cardio has been
            running is true on every tab alike. */}
        {showClock && (
          <div className="entry-duration">
            <Icon name="clock" size={12} /> Duração:{' '}
            <span className="session-clock">{fmtClock(elapsed)}</span>
          </div>
        )}

        {/* First control on the screen: mid-workout, choosing between execution,
            note and photos must never require scrolling. */}
        <Tabs<EntryTab>
          tabs={[
            { id: 'exec', label: 'Execução' },
            { id: 'notes', label: 'Notas' },
            // Of the exercise being SHOWN, like the panels below: while
            // previewing an alternative, it is that movement's tally that means
            // anything.
            { id: 'videos', label: 'Vídeos', count: exercise?.videos?.length },
            { id: 'photo', label: 'Foto', count: photos?.length },
          ]}
          active={tab}
          onChange={setTab}
        />

        {/* All four read the exercise being SHOWN: while previewing an
            alternative, its OWN per-gym weight, note, videos and photos are what
            the user needs to see — that is how they decide whether to do it
            instead. */}
        {tab === 'photo' ? (
          /* Photos stay editable on a completed session: unlike the weight, a
             photo describes the exercise in this gym, not this session. */
          <PhotoTab gymId={session.gymId} exerciseId={shownId} />
        ) : tab === 'videos' ? (
          /* Opening one changes nothing about the session: the viewer is local
             state, so closing it lands back on this entry, on this tab. */
          <VideosTab exercise={exercise} />
        ) : tab === 'notes' ? (
          <>
            <CategoryChips names={catNames} />
            <NoteEditor gymId={session.gymId} exerciseId={shownId} />
          </>
        ) : (
          <>
            {/* The media lives here, not above the tabs: it answers "how is this
                executed", a question the other two tabs never ask, and it is
                tall enough to push their content off the fold from up there. */}
            <div className="hero">
              <Media url={exercise?.mediaUrl} alt={shownName} className="hero-media" />
            </div>
            {/* Warm-ups of the exercise being SHOWN — while previewing an
                alternative, it is that movement's warm-up that matters. */}
            <WarmupButton exercise={exercise} />
            {/* Per-gym target weight (same editor as the catalog); read-only once
                completed. Absent for cardio — there is no load to show. */}
            {exercise?.kind !== 'cardio' && (
              <WeightEditor gymId={session.gymId} exerciseId={shownId} readOnly={readOnly} />
            )}
            {/* Not while previewing: nesting alternatives-of-alternatives would
                let the user wander away from the entry they are doing. */}
            {!previewing && (
              <AlternativesSection
                exercise={entryExercise}
                hrefFor={(id) => `${entryUrl}?alt=${id}`}
              />
            )}
          </>
        )}
      </main>

      {/* Outside <main> and outside the tab panels: the stepper is fixed chrome,
          so it stays put on every tab alike.

          While previewing an alternative the bar carries the one decision that
          matters here — "I did this one instead" — and no Voltar/Avançar:
          stepping belongs to the session's list, and this screen is off to the
          side of it. On a completed session there is nothing to decide. */}
      {previewing ? (
        <StepperBar
          action={
            readOnly ? undefined : (
              <button className="btn primary" onClick={onSwap}>
                <Icon name="arrows-left-right" /> Fiz este no lugar
              </button>
            )
          }
        />
      ) : (
        <StepperBar
          action={
            readOnly ? (
              <span className={`entry-done-state${entry.done ? ' done' : ''}`}>
                <Icon name={entry.done ? 'check' : 'minus'} size={14} />
                {entry.done ? 'Concluído' : 'Não feito'}
              </span>
            ) : (
              <button
                className={`btn ${entry.done ? 'done' : 'primary'}`}
                onClick={onCompleteAndAdvance}
              >
                <Icon name={entry.done ? 'check' : 'circle'} />{' '}
                {entry.done ? 'Concluído' : 'Concluir'}
              </button>
            )
          }
          // No Voltar/Avançar when there is nowhere to step: a cardio session
          // holds a single exercise, and two permanently dead controls say less
          // than no controls at all.
          onPrev={entries.length > 1 ? () => prevId != null && goTo(prevId) : undefined}
          onNext={entries.length > 1 ? () => nextId != null && goTo(nextId) : undefined}
          prevDisabled={prevId == null}
          nextDisabled={nextId == null}
        />
      )}
    </>
  )
}
