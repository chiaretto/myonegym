import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { db } from '../../db/db'
import { completeSession, setEntryDone, swapEntryExercise, ValidationError } from '../../db/repos'
import {
  useCategoryMap,
  useExerciseMap,
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
import { WeightEditor } from '../exercise/WeightEditor'
import '../exercise/exercise.css'
import './session.css'

type EntryTab = 'exec' | 'notes' | 'photo'

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

  const backTo = `/session/${sessionId}`
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
  const entryExercise = entry.exerciseId != null ? exMap.get(entry.exerciseId) : undefined

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
  const shownId = previewing?.id ?? entry.exerciseId ?? null
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
        nav('/sessions')
        return
      }
    }
    nav(`/session/${sessionId}`) // declined, or not all done → back to the runner
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

        {/* First control on the screen: mid-workout, choosing between execution,
            note and photos must never require scrolling. */}
        <Tabs<EntryTab>
          tabs={[
            { id: 'exec', label: 'Execução' },
            { id: 'notes', label: 'Observações' },
            { id: 'photo', label: 'Foto' },
          ]}
          active={tab}
          onChange={setTab}
        />

        {/* All three read `shownId`: while previewing an alternative, its OWN
            per-gym weight, note and photos are what the user needs to see —
            that is how they decide whether to do it instead. */}
        {tab === 'photo' ? (
          /* Photos stay editable on a completed session: unlike the weight, a
             photo describes the exercise in this gym, not this session. */
          <PhotoTab gymId={session.gymId} exerciseId={shownId} />
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
            {/* Per-gym target weight (same editor as the catalog); read-only once completed */}
            <WeightEditor gymId={session.gymId} exerciseId={shownId} readOnly={readOnly} />
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
          so it stays put on Execução, Observações and Foto alike.

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
          onPrev={() => prevId != null && goTo(prevId)}
          onNext={() => nextId != null && goTo(nextId)}
          prevDisabled={prevId == null}
          nextDisabled={nextId == null}
        />
      )}
    </>
  )
}
