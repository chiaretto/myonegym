import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { db } from '../../db/db'
import { useCategoryMap, useDays } from '../../lib/hooks'
import { useActiveGym } from '../../state/activeGym'
import { AlternativesSection } from './AlternativesSection'
import { CategoryChips } from './CategoryChips'
import { exerciseCategoryNames } from '../../lib/days'
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

  // The training day this exercise was opened from. An exercise can belong to
  // several days, so it cannot be inferred — it is carried in the URL, which is
  // also what lets Back return to Home with that day still expanded.
  const dayId = Number(params.get('day'))
  const fromDay = (days ?? []).find((d) => d.id === dayId)
  // A stale or absent day degrades to the pre-existing behaviour: no stepper,
  // Back to a plain Home.
  const backTo = fromDay ? `/?day=${fromDay.id}` : '/'

  // Neighbours within that day's ordered list. Alternatives do not affect it:
  // a day lists the exercises the user put in it, and an alternative that is
  // not in the day is not a stop on the way through it.
  const dayIdx = fromDay ? fromDay.exerciseIds.indexOf(exerciseId) : -1
  // Opening an alternative carries the day along so Back still works, but that
  // alternative may not be IN the day — and a stepper with both arrows dead is
  // worse than no stepper.
  const inDay = dayIdx >= 0
  const prevEx = dayIdx > 0 ? fromDay!.exerciseIds[dayIdx - 1] : undefined
  const nextEx =
    fromDay && inDay && dayIdx < fromDay.exerciseIds.length - 1
      ? fromDay.exerciseIds[dayIdx + 1]
      : undefined
  // Stepping keeps the day, so the context survives across exercises.
  const goTo = (id: number) => nav(`/exercise/${id}?day=${fromDay!.id}`)
  const catNames = exerciseCategoryNames(exercise ?? undefined, catMap)
  // Opening an alternative keeps the day in the address, so Voltar still lands
  // on the Home the user came from — even though that alternative may not be
  // in the day itself (its stepper is then simply absent).
  const altHref = (id: number) => (fromDay ? `/exercise/${id}?day=${fromDay.id}` : `/exercise/${id}`)

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
      <main className={`screen${fromDay ? ' has-action-bar' : ''}`}>
        {/* Tabs first, meeting the top bar: which of the three things the user
            came to look at is the first decision on this screen. No title (the
            name is in the top bar), no training day, and no categories — those
            now read with the note, inside "Observações". Same arrangement as
            the in-session detail; only this tab's label differs. */}
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
          <>
            <CategoryChips names={catNames} />
            <NoteEditor gymId={activeGymId ?? null} exerciseId={exerciseId} />
          </>
        ) : (
          <>
            <div className="hero">
              <Media url={exercise.mediaUrl} alt={exercise.name} className="hero-media" />
            </div>
            {/* Cardio has no target load — a treadmill has nothing to define,
                so the card is absent rather than empty. */}
            {exercise.kind !== 'cardio' && (
              <WeightEditor gymId={activeGymId ?? null} exerciseId={exerciseId} />
            )}
            {/* Under the weight, not in the header: this is a place to go, not
                a label, and it can be several rows tall. */}
            <AlternativesSection exercise={exercise} hrefFor={altHref} />
          </>
        )}
      </main>

      {/* Only when opened from a day THIS exercise is in: without one there is
          no defined "next". No Concluir here — that belongs to a session. */}
      {inDay && (
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
