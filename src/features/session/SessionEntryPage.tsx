import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db } from '../../db/db'
import { completeSession, setEntryDone } from '../../db/repos'
import {
  useCategoryMap,
  useExerciseMap,
  useSession,
  useSessionEntries,
  useSessionEntry,
} from '../../lib/hooks'
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

  const [tab, setTab] = useState<EntryTab>('exec')

  const backTo = `/session/${sessionId}`
  if (session === undefined || entry === undefined) return <BackBar title="Exercício" to={backTo} />
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
  const exercise = entry.exerciseId != null ? exMap.get(entry.exerciseId) : undefined
  const catNames = exerciseCategoryNames(exercise, catMap)

  // Guided stepper over the session's exercises (in list order).
  const idx = entries.findIndex((e) => e.id === eId)
  const prevId = idx > 0 ? entries[idx - 1].id : undefined
  const nextId = idx >= 0 && idx < entries.length - 1 ? entries[idx + 1].id : undefined
  const goTo = (id: number) => nav(`/session/${sessionId}/entry/${id}`)

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
      <BackBar title={entry.exerciseName} to={backTo} />
      <main className="screen has-action-bar">
        <div className="hero">
          <Media url={exercise?.mediaUrl} alt={entry.exerciseName} className="hero-media" />
        </div>

        {/* No title here: the name already sits in the top bar. The session's day
            is not repeated either — it was chosen moments ago in the runner.
            "Concluído" stays: it is status, not navigation context. */}
        {(entry.done || catNames.length > 0) && (
          <div className="ex-head">
            <div className="ex-chips">
              {entry.done && (
                <span className="chip accent">
                  <Icon name="check" size={12} /> Concluído
                </span>
              )}
              {catNames.map((name) => (
                <span key={name} className="chip">
                  <Icon name="tag" size={12} /> {name}
                </span>
              ))}
            </div>
          </div>
        )}

        <Tabs<EntryTab>
          tabs={[
            { id: 'exec', label: 'Execução' },
            { id: 'notes', label: 'Observações' },
            { id: 'photo', label: 'Foto' },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'photo' ? (
          /* Photos stay editable on a completed session: unlike the weight, a
             photo describes the exercise in this gym, not this session. */
          <PhotoTab gymId={session.gymId} exerciseId={entry.exerciseId ?? null} />
        ) : tab === 'notes' ? (
          <NoteEditor gymId={session.gymId} exerciseId={entry.exerciseId ?? null} />
        ) : (
          /* Per-gym target weight (same editor as the catalog); read-only once completed */
          <WeightEditor
            gymId={session.gymId}
            exerciseId={entry.exerciseId ?? null}
            readOnly={readOnly}
          />
        )}
      </main>

      {/* Outside <main> and outside the tab panels: the stepper is fixed chrome,
          so it stays put on Execução, Observações and Foto alike. */}
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
              <Icon name={entry.done ? 'check' : 'circle'} /> {entry.done ? 'Concluído' : 'Concluir'}
            </button>
          )
        }
        onPrev={() => prevId != null && goTo(prevId)}
        onNext={() => nextId != null && goTo(nextId)}
        prevDisabled={prevId == null}
        nextDisabled={nextId == null}
      />
    </>
  )
}
