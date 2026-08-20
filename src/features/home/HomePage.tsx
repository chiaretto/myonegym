import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { db } from '../../db/db'
import { startSession, ValidationError } from '../../db/repos'
import {
  useActiveSession,
  useCategoryMap,
  useDays,
  useExerciseMap,
  useGymWeights,
  useSessionSummaries,
} from '../../lib/hooks'
import { useActiveGym } from '../../state/activeGym'
import {
  dayCategoryNames,
  daySubtitle,
  exerciseCategoryNames,
  nextWorkoutDayId,
} from '../../lib/days'
import { muscleAvatarClass } from '../../lib/muscleAvatar'
import logoMark from '../../assets/logo-mark.png'
import { busySessionMessage, fmtWeight } from '../../lib/format'
import {
  buildWeekTrack,
  currentStreak,
} from '../../lib/week'
import { useToast } from '../../ui/Feedback'
import { Icon } from '../../ui/Icon'
import { Media } from '../../ui/Media'
import { TabBar } from '../../ui/Chrome'
import { WeeklySummary } from '../../ui/WeeklySummary'
import { GymSelector } from '../gym/GymSelector'
import './home.css'

export function HomePage() {
  const days = useDays()
  const exMap = useExerciseMap()
  const catMap = useCategoryMap()
  const activeGymId = useActiveGym((s) => s.activeGymId)
  const weights = useGymWeights(activeGymId)
  // Per gym: a workout happens in one place, and only that gym's in-progress
  // session can be resumed from here.
  const activeSession = useActiveSession(activeGymId)
  // Across gyms: the week summary and the next-day rotation both read the whole
  // history. Someone training at two gyms has one week and one rotation.
  const summaries = useSessionSummaries()
  const nav = useNavigate()
  const toast = useToast()

  // The expanded day lives in the URL, not in component state: React unmounts
  // Home when an exercise detail opens, which would reset local state and lose
  // the user's place on the way back. `replace` so expanding/collapsing doesn't
  // pile up history entries (Back must leave Home, not walk the accordion).
  const [params, setParams] = useSearchParams()
  const dayParam = Number(params.get('day'))
  const openId = Number.isInteger(dayParam) && dayParam > 0 ? dayParam : null
  const toggleDay = (id: number) => {
    const next = new URLSearchParams(params)
    if (openId === id) next.delete('day')
    else next.set('day', String(id))
    setParams(next, { replace: true })
  }

  // CHANGED: the summary used to be a single count against `days.length`. It is
  // now a seven-day track against a fixed goal of 7 — see lib/week.ts.
  //
  // Everything below waits for `summaries` to arrive. An unanswered history is
  // not an empty one: deriving from `[]` would paint "0 / 7 treinos" and put
  // "Próximo treino" on the first day, then correct both a frame later.
  const now = Date.now()
  const completed = (summaries ?? []).filter((s) => s.session.completedAt != null)
  // A subset of the completions, same as the Consistência calendar builds: it
  // decides where the star goes and nothing else — a cardio still counts in the
  // number and in the streak like any other workout.
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

  // "Próximo treino": the day after the most recent completed session (summaries
  // are newest-first, across every gym), wrapping to the first day. Training
  // days are global — useDays() takes no gym — so the rotation has no reason to
  // restart when the user trains somewhere else.
  //
  // The most recent STRENGTH one, specifically. A cardio session carries no
  // `dayId` (it belongs to no day), so feeding it here handed nextWorkoutDayId a
  // null — which it correctly reads as "no history" and answers with the first
  // day. The rotation would jump back to Dia 1 after every cardio, losing the
  // user's place. Filtering here rather than inside nextWorkoutDayId keeps that
  // function taking a dayId and knowing nothing about sessions: the bug was in
  // *which* session was picked, not in how the rotation advances.
  const lastStrength = completed.find(
    (s) => s.session.kind === 'strength' && s.session.dayId != null,
  )
  const nextDayId = summaries
    ? nextWorkoutDayId(days ?? [], lastStrength?.session.dayId ?? null)
    : null

  const onStart = async (dayId: number) => {
    if (activeGymId == null) {
      toast('Crie ou selecione uma academia primeiro.')
      return
    }
    // Still asking whether a workout is already in progress. Starting a second
    // one would be rejected by the repository anyway; better to let the tap fall
    // on the floor for the millisecond it takes to know.
    if (activeSession === undefined) return
    if (activeSession) {
      // Only one active session per gym, and a day that is NOT the session's
      // says exactly that and nothing else. This button is drawn disabled (see
      // isBlocked), and taking someone who tapped "Iniciar" on Dia 3 into the
      // Dia 1 workout was a third outcome they asked for neither. It still
      // answers the tap — a control that goes dead under the finger reads as a
      // frozen app — but it answers with the reason alone.
      //
      // CHANGED: that now holds for a running CARDIO too, which used to be
      // ferried to from here because it owns no day card. Its own row on the
      // Cardio tab offers "Continuar", so the way back exists; naming the kind
      // in the message is what points at it.
      if (activeSession.dayId !== dayId) {
        toast(busySessionMessage(activeSession.kind))
        return
      }
      // This day's own session: the button reads "Continuar", and it resumes.
      nav(`/session/${activeSession.id}`)
      return
    }
    try {
      const sid = await startSession(activeGymId, dayId, db)
      nav(`/session/${sid}`)
    } catch (e) {
      toast(e instanceof ValidationError ? e.message : 'Não foi possível iniciar o treino.')
    }
  }

  return (
    <>
      <header className="appbar">
        {/* aria-label is NOT redundant with the text below: name-from-content
            joins each element's contribution with a space, so the split wordmark
            computes to "My One Gym" and would be announced that way. The label
            pins the brand's real spelling. It also gives the tests a stable
            handle — findByText cannot see through the split, because Testing
            Library's getNodeText joins only *direct* child text nodes and so
            reads this heading as "MyGym". */}
        <h1 aria-label="MyOneGym">
          {/* CHANGED: the brand mark is the logo PNG, not a gradient tile with an
              icon-font barbell in it.

              CHANGED: the wordmark is split as My<em>One</em>Gym to paint "One"
              in red (.wordmark em, global.css), matching the mockups and the
              splash lockup. It used to be a single text node purely to keep
              findByText('MyOneGym') working; that assertion moved to the
              heading's accessible name instead. */}
          <img className="brand-mark" src={logoMark} alt="" />
          <span className="wordmark">
            My<em>One</em>Gym
          </span>
        </h1>
        <span className="spacer" />
        <GymSelector />
      </header>

      <main className="screen">
        {days && days.length === 0 && (
          <div className="empty">
            <span className="big">🏋️</span>
            <h2>Nenhum dia de treino ainda</h2>
            <p>Crie academias, exercícios e dias de treino em Configurações para começar.</p>
            <Link to="/settings" className="btn primary" style={{ width: 'auto' }}>
              Ir para Configurações
            </Link>
          </div>
        )}

        {days && days.length > 0 && weekCells && (
          <WeeklySummary cells={weekCells} streak={streak} />
        )}

        <ul className="accordion">
          {days?.map((day) => {
            const isOpen = openId === day.id
            const isResume = activeSession != null && activeSession.dayId === day.id
            // Feature the next workout day (from history) when nothing is being
            // resumed. `=== null` and not `== null`: while the active session is
            // still unknown, "nothing is being resumed" is not yet true, and
            // guessing moves the badge between cards a frame later.
            const isFeatured = day.id === nextDayId && activeSession === null
            // Only one session per gym, so while one is open every OTHER day is
            // unstartable. It used to look otherwise: five red pills, four of
            // them promising something the rule forbids. `!= null` covers both
            // "no session" and "still loading" — painting these grey before the
            // read answers would flash the whole accordion on every return to
            // Home, the same reason isFeatured waits above.
            const isBlocked = activeSession != null && activeSession.dayId !== day.id
            return (
              <li
                key={day.id}
                className={`day${isOpen ? ' open' : ''}${isFeatured ? ' featured' : ''}`}
              >
                {isFeatured && !isOpen && <span className="eyebrow day-eyebrow">Próximo treino</span>}
                {/* CHANGED: two lines. Line 1 is the day name plus the chevron;
                    line 2 is the avatar, categories and the Iniciar pill.
                    The chevron sits with the NAME because what expands is the
                    day, and because beside Iniciar it read as a second action of
                    equal weight — it is a disclosure indicator, not a command.

                    The WHOLE head toggles, so the avatar, the categories and the
                    padding are live too — they looked tappable and were not. The
                    handler is on this container because the head already holds
                    another control (the Iniciar pill) and a <button> cannot
                    contain a <button>.

                    .day-head-main stays a real button so the accessibility tree
                    keeps one properly named, aria-expanded control per day — but
                    it deliberately has NO onClick of its own: pointer and
                    keyboard activation both produce a click that bubbles here,
                    and a second handler would toggle twice and cancel itself.
                    The div takes no role and no tabindex, so it adds nothing to
                    the accessibility tree; it is a hit area, not a control. */}
                <div className="day-head" onClick={() => toggleDay(day.id!)}>
                  <button className="day-head-main" aria-expanded={isOpen}>
                    <span className="day-title">{day.name}</span>
                    <i className="png-ic pi-chevron-down chev day-chev" aria-hidden />
                  </button>
                  <div className="day-meta">
                    <span className="day-ic">
                      <i
                        className={`png-ic ${muscleAvatarClass(dayCategoryNames(day, exMap, catMap))}`}
                        aria-hidden
                      />
                    </span>
                    <span className="day-sub">{daySubtitle(day, exMap, catMap)}</span>
                    <span className="day-actions">
                      {/* CHANGED: the label lives in .day-start-lab, which CSS
                          hides on every day that is neither featured nor being
                          resumed — those keep the play glyph alone, in a circle.
                          display:none drops the text from the accessibility
                          tree, so the name has to come from aria-label; it is
                          the plain verb (not "Iniciar treino") so the visible
                          text and the accessible name still match where the
                          label IS shown. */}
                      {/* stopPropagation: this button sits inside the head, and
                          the head toggles the day. Without it, starting a
                          workout would also expand the card on the way out. */}
                      {/* aria-disabled, NOT the disabled attribute: a disabled
                          button receives no events at all, so on a touch device
                          it would be indistinguishable from a hung app — the
                          same argument that made the whole head tappable. This
                          one stays focusable, announces itself as disabled, and
                          still explains itself when tapped. The accessible name
                          stays the plain verb: it is the button for starting
                          THIS day, merely unavailable. */}
                      <button
                        className={`day-start${isResume ? ' resume' : ''}${isFeatured ? ' featured' : ''}${isBlocked ? ' blocked' : ''}`}
                        aria-label={isResume ? 'Continuar' : 'Iniciar'}
                        aria-disabled={isBlocked || undefined}
                        onClick={(e) => {
                          e.stopPropagation()
                          onStart(day.id!)
                        }}
                      >
                        <i className="png-ic pi-play" aria-hidden />
                        <span className="day-start-lab">{isResume ? 'Continuar' : 'Iniciar'}</span>
                      </button>
                    </span>
                  </div>
                </div>

                {isOpen && (
                  <ul className="exercises">
                    {day.exerciseIds.length === 0 && (
                      <li className="ex-empty">Nenhum exercício neste dia.</li>
                    )}
                    {day.exerciseIds.map((exId, i) => {
                      const ex = exMap.get(exId)
                      if (!ex) return null
                      const w = weights?.get(exId)
                      const exCats = exerciseCategoryNames(ex, catMap)
                      return (
                        <li key={`${exId}-${i}`}>
                          <Link className="exercise" to={`/exercise/${exId}?day=${day.id}`}>
                            <Media className="thumb" url={ex.mediaUrl} alt={ex.name} />
                            <span className="ex-body">
                              <span className="ex-name">{ex.name}</span>
                              {exCats.length > 0 && <span className="ex-cat">{exCats.join(' · ')}</span>}
                            </span>
                            {/* No badge until the gym's weights have loaded:
                                "definir" claims this exercise has no target
                                weight, which is not yet known.

                                And never for cardio, which has no load at all —
                                "definir" would nag for a number that cannot
                                exist. A cardio exercise should not be in a day
                                (turning one into cardio removes it), so this is
                                belt-and-braces: the rule holds here by itself
                                rather than by that invariant holding elsewhere. */}
                            {weights &&
                              ex.kind !== 'cardio' &&
                              (w ? (
                                <span className="weight-badge">{fmtWeight(w.value, w.unit)}</span>
                              ) : (
                                <span className="weight-badge empty">definir</span>
                              ))}
                            {/* Icon-only "this row opens the detail" cue, matching
                                the session runner's rows. */}
                            <Icon name="chevron-right" className="chev row-chev" />
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </main>

      <TabBar active="home" />
    </>
  )
}
