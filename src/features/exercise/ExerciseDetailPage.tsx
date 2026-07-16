import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { db } from '../../db/db'
import { useCategoryMap, useDays } from '../../lib/hooks'
import { useActiveGym } from '../../state/activeGym'
import { Icon } from '../../ui/Icon'
import { Media } from '../../ui/Media'
import { BackBar } from '../../ui/Chrome'
import { StepperBar } from '../../ui/StepperBar'
import { Tabs } from '../../ui/Tabs'
import { PhotoTab } from './photo/PhotoTab'
import { NoteEditor } from './NoteEditor'
import { WeightEditor } from './WeightEditor'
import './exercise.css'

type DetailTab = 'detail' | 'notes' | 'photo'

export function ExerciseDetailPage() {
  const { id } = useParams()
  const exerciseId = Number(id)
  const exercise = useLiveQuery(() => db.exercises.get(exerciseId), [exerciseId])
  const catMap = useCategoryMap()
  const days = useDays()
  const activeGymId = useActiveGym((s) => s.activeGymId)
  const nav = useNavigate()
  const [params] = useSearchParams()

  const [tab, setTab] = useState<DetailTab>('detail')

  const inDays = useMemo(
    () => (days ?? []).filter((day) => day.exerciseIds.includes(exerciseId)),
    [days, exerciseId],
  )

  // The training day this exercise was opened from. An exercise can belong to
  // several days, so it cannot be inferred — it is carried in the URL, which is
  // also what lets Back return to Home with that day still expanded.
  const dayId = Number(params.get('day'))
  const fromDay = (days ?? []).find((d) => d.id === dayId)
  // A stale or absent day degrades to the pre-existing behaviour: no stepper,
  // Back to a plain Home.
  const backTo = fromDay ? `/?day=${fromDay.id}` : '/'

  // Neighbours within that day's ordered list.
  const dayIdx = fromDay ? fromDay.exerciseIds.indexOf(exerciseId) : -1
  const prevEx = dayIdx > 0 ? fromDay!.exerciseIds[dayIdx - 1] : undefined
  const nextEx =
    fromDay && dayIdx >= 0 && dayIdx < fromDay.exerciseIds.length - 1
      ? fromDay.exerciseIds[dayIdx + 1]
      : undefined
  // Stepping keeps the day, so the context survives across exercises.
  const goTo = (id: number) => nav(`/exercise/${id}?day=${fromDay!.id}`)
  const cat = exercise?.categoryId != null ? catMap.get(exercise.categoryId) : undefined

  if (exercise === undefined) return <BackBar title="Exercício" to={backTo} />
  if (exercise === null) {
    return (
      <>
        <BackBar title="Exercício" to={backTo} />
        <div className="empty">
          <p>Exercício não encontrado.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <BackBar title={exercise.name} to={backTo} />
      <main className={`screen${fromDay ? ' has-stepper' : ''}`}>
        <div className="hero">
          <Media url={exercise.mediaUrl} alt={exercise.name} className="hero-media" />
        </div>

        <div className="ex-head">
          <h2 className="ex-title">{exercise.name}</h2>
          <div className="ex-chips">
            {cat && (
              <span className="chip">
                <Icon name="tag" size={12} /> {cat.name}
              </span>
            )}
            {inDays.length > 0 && (
              <span className="chip">
                <Icon name="calendar-event" size={12} />{' '}
                {inDays.length === 1 ? inDays[0].name : `${inDays.length} dias`}
              </span>
            )}
          </div>
        </div>

        <Tabs<DetailTab>
          tabs={[
            { id: 'detail', label: 'Detalhe' },
            { id: 'notes', label: 'Observações' },
            { id: 'photo', label: 'Foto' },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'photo' ? (
          <PhotoTab gymId={activeGymId ?? null} exerciseId={exerciseId} />
        ) : tab === 'notes' ? (
          <NoteEditor gymId={activeGymId ?? null} exerciseId={exerciseId} />
        ) : (
          <WeightEditor gymId={activeGymId ?? null} exerciseId={exerciseId} />
        )}
      </main>

      {/* Only when opened from a day: without one there is no defined "next".
          No Concluir here — that belongs to a workout session. */}
      {fromDay && (
        <StepperBar
          onPrev={() => prevEx != null && goTo(prevEx)}
          onNext={() => nextEx != null && goTo(nextEx)}
          prevDisabled={prevEx == null}
          nextDisabled={nextEx == null}
        />
      )}
    </>
  )
}
