import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { db } from '../../db/db'
import { completeSession, setEntryDone, swapEntryExercise, ValidationError } from '../../db/repos'
import { useElapsed } from '../../lib/elapsed'
import { useWakeLock } from '../../lib/wakeLock'
import { fmtClock } from '../../lib/format'
import {
  useCategoryMap,
  useExerciseMap,
  useNote,
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
import { RestTimer } from './RestTimer'
import { StepperBar } from '../../ui/StepperBar'
import { Tabs } from '../../ui/Tabs'
import { NoteEditor } from '../exercise/NoteEditor'
import { VideosTab } from '../exercise/VideosTab'
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

  // The rest-between-sets stopwatch. Only the START INSTANT is state; the
  // elapsed time is derived from the clock by `useElapsed`, which is what makes
  // the count survive the phone going in a pocket mid-rest — the exact case
  // this exists for. `null` is "stopped", so toggling is one assignment.
  //
  // It lives on the page, not in the tab panel: checking the machine's note or
  // photo mid-rest must not kill the count. Leaving "Execução" only takes the
  // media away, and with it the button that rides on top of it.
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null)
  const timerElapsed = useElapsed(timerStartedAt)
  // The phone is on the bench while this counts, and a screen that sleeps takes
  // the stopwatch with it. Only while the REST timer runs — see `useWakeLock`.
  useWakeLock(timerStartedAt != null)
  // Stepping to another exercise resets it, and this has to be said out loud:
  // the route keeps the same component and only swaps a param, so React
  // reconciles rather than remounts and every useState above would otherwise
  // carry over. The rest belongs to the set that was just done.
  useEffect(() => setTimerStartedAt(null), [eId])

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
  // Of the exercise being SHOWN, like the tally beside "Vídeos": while
  // previewing an alternative, it is that movement's note that means anything.
  const note = useNote(session?.gymId ?? null, shownId)

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
  const doneCount = entries.filter((e) => e.done).length
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

  // Marking and un-marking are NOT the same gesture, so they do not do the same
  // thing. Marking is "next" — it keeps the workout's one-tap rhythm and moves
  // on. Un-marking is "undo", and an undo that changes screen is not an undo:
  // it is what rescues the accidental tap (a thumb on the phone as it comes off
  // the bench), so it has to land the user back on the entry it just freed.
  const onToggleDone = async () => {
    if (readOnly) return
    if (entry.done) {
      await setEntryDone(eId, false, db)
      return
    }
    await onCompleteAndAdvance()
  }

  // Where this exercise sits in the day, one segment per exercise, in the
  // runner's order. It rides the floating bar at the bottom rather than the top
  // of the screen: that block is already fixed and already the thing the thumb
  // returns to between sets, so the progress sits with the controls that move
  // through it instead of opening a second band of chrome up top.
  //
  // An indicator, not a control. It is inches from Concluir and from both
  // arrows, so a tappable segment here would be a mis-tap waiting to happen;
  // jumping around stays the job of the arrows and of the runner one tap up.
  // `role="img"` carries the whole strip as the one sentence it draws, which is
  // also why the segments say nothing of their own.
  //
  // Absent on a single-entry session (cardio): a lone full-width segment tells
  // the user nothing, the same reason the arrows are absent there.
  const progress =
    idx >= 0 && entries.length > 1 ? (
      <div
        className="entry-progress"
        role="img"
        aria-label={`Exercício ${idx + 1} de ${entries.length}, ${doneCount} ${
          doneCount === 1 ? 'concluído' : 'concluídos'
        }`}
      >
        {entries.map((e, i) => (
          <span
            key={e.id}
            className={`entry-seg${e.done ? ' done' : ''}${i === idx ? ' current' : ''}`}
          />
        ))}
      </div>
    ) : undefined

  return (
    <>
      {/* Previewing an alternative: Back returns to the entry, not to the
          runner — the user is one level deeper, not somewhere else. */}
      <BackBar title={shownName} to={previewing ? entryUrl : backTo} />
      <main className="screen has-action-bar">
        {/* Above the tabs: only the fact that this is NOT the entry's own
            exercise. No title (the name is in the top bar), no training day
            (chosen moments ago in the runner) and no categories: those describe
            the exercise and now read with the note.

            The entry's "Concluído" chip used to live here too and is gone: the
            screen says it three other ways now — the ticked box and its label in
            the floating bar, that bar's calm done tint, and the filled segment in
            the progress strip. A fourth badge for the same fact was just a line
            of screen a mid-workout user had to read past. */}
        {previewing && (
          <div className="ex-head">
            <div className="ex-chips">
              <span className="chip">
                <Icon name="arrows-left-right" size={12} /> Alternativa de{' '}
                {entryExercise?.name ?? entry.exerciseName}
              </span>
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
            { id: 'notes', label: 'Notas', mark: !!note?.text.trim() },
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
              {/* Over the media, not under it: the stopwatch is a tool used
                  while looking at the exercise, not part of it. Below, it would
                  push the target weight off the fold on the app's most-scrolled
                  screen; on top, it costs no height at all. */}
              <RestTimer
                elapsed={timerElapsed}
                running={timerStartedAt != null}
                onToggle={() => setTimerStartedAt((at) => (at == null ? Date.now() : null))}
              />
            </div>
            {/* Warm-ups of the exercise being SHOWN — while previewing an
                alternative, it is that movement's warm-up that matters. */}
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
          /* The preview is off to the side of the entry, not a different one, so
             the strip still reads the session with that entry as the current. */
          progress={progress}
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
          progress={progress}
          action={
            readOnly ? (
              <span className={`entry-done-state${entry.done ? ' done' : ''}`}>
                <Icon name={entry.done ? 'check' : 'minus'} size={14} />
                {entry.done ? 'Concluído' : 'Não feito'}
              </span>
            ) : (
              /* A toggle wearing a checkbox, and `aria-pressed` rather than
                 `role="checkbox"`: marking also navigates, and a checkbox that
                 changes screen is not a checkbox. `aria-pressed` is what the
                 runner's row checkbox already uses, so the two are now one
                 control in two places. The box itself is aria-hidden — the
                 label and the pressed state already say everything it draws. */
              <button
                className={`btn entry-done-toggle ${entry.done ? 'done' : 'primary'}`}
                aria-pressed={entry.done}
                onClick={onToggleDone}
              >
                <span className={`done-box${entry.done ? ' checked' : ''}`} aria-hidden>
                  {entry.done && <Icon name="check" size={13} />}
                </span>
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
