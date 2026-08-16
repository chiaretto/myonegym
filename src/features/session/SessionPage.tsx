import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../../db/db'
import { completeSession, deleteSession, setEntryDone } from '../../db/repos'
import type { SessionEntry } from '../../db/types'
import { exerciseCategoryNames } from '../../lib/days'
import { useElapsed } from '../../lib/elapsed'
import { fmtClock, fmtDuration, fmtNumber, relativeDate } from '../../lib/format'
import { useSettings } from '../../state/settings'
import { renderCard } from './share/renderCard'
import { shareFilename, shareSessionImage } from './share/shareCard'
import { buildShareCard, type ShareVariant } from './share/shareModel'
import {
  useCategoryMap,
  useExerciseMap,
  useExercises,
  useGymWeights,
  useGyms,
  useSession,
  useSessionEntries,
} from '../../lib/hooks'
import { ActionBar } from '../../ui/ActionBar'
import { useConfirm, useToast } from '../../ui/Feedback'
import { Icon } from '../../ui/Icon'
import { Media } from '../../ui/Media'
import './session.css'

export function SessionPage() {
  const { id } = useParams()
  const sessionId = Number(id)
  const session = useSession(sessionId)
  const entries = useSessionEntries(sessionId)
  const gyms = useGyms()
  const weights = useGymWeights(session?.gymId ?? null)
  const exs = useExercises()
  const exMap = useExerciseMap()
  const catMap = useCategoryMap()
  const accent = useSettings((s) => s.accent)
  const toast = useToast()
  const confirm = useConfirm()
  const nav = useNavigate()
  const [sharing, setSharing] = useState<ShareVariant | null>(null)
  // Only an open session runs a clock — a completed one has a fixed duration,
  // printed with the rest of its summary at the bottom of the screen. Called
  // above the early returns, where every hook on this screen has to live.
  const elapsed = useElapsed(session?.status === 'active' ? session.startedAt : null)

  // `entries` joins the wait: the progress row counts them, and "0 de 0
  // concluídos" is a claim about the workout, not about the loading.
  if (session === undefined || entries === undefined) return <SessionBar onDelete={undefined} />
  if (session === null) {
    return (
      <>
        <SessionBar onDelete={undefined} />
        <div className="empty">
          <p>Sessão não encontrada.</p>
        </div>
      </>
    )
  }

  const readOnly = session.status === 'completed'
  const gym = gyms?.find((g) => g.id === session.gymId)
  const total = entries.length
  const done = entries.filter((e) => e.done).length
  const pct = total ? Math.round((done / total) * 100) : 0

  const catFor = (entry: SessionEntry) => {
    const ex = entry.exerciseId != null ? exMap.get(entry.exerciseId) : undefined
    const names = exerciseCategoryNames(ex, catMap)
    return names.length ? names.join(' · ') : undefined
  }
  const mediaFor = (entry: SessionEntry) =>
    entry.exerciseId != null ? exMap.get(entry.exerciseId)?.mediaUrl : undefined

  const onToggle = async (entry: SessionEntry) => {
    if (readOnly) return
    await setEntryDone(entry.id!, !entry.done, db)
  }

  const onComplete = async () => {
    await completeSession(sessionId, db)
    toast('Treino concluído.')
    // Stay on this session, which is now its own summary: the share buttons
    // appear the moment it is completed, and the history is one tap away.
    // Jumping to the list buried the one thing the user is most likely to want
    // right after finishing.
    nav(`/session/${sessionId}`, { replace: true })
  }

  const onShare = async (variant: ShareVariant) => {
    if (sharing) return // a second tap would open a second share sheet
    // The card prints the target weights; generating it before they load would
    // silently ship a card with none.
    if (!weights) return
    setSharing(variant)
    try {
      const card = buildShareCard({ session, entries, gym, weights, exMap, catMap, variant })
      // The shared PNG carries the user's accent — canvas cannot read the CSS
      // custom property, so the choice is passed in.
      const blob = await renderCard(card, accent)
      const filename = shareFilename(session.dayName, session.completedAt ?? session.startedAt)
      const outcome = await shareSessionImage(blob, filename, session.dayName)
      if (outcome === 'downloaded') toast('Imagem salva.')
    } catch {
      toast('Não foi possível gerar a imagem.')
    } finally {
      setSharing(null)
    }
  }

  const onDelete = async () => {
    const ok = await confirm({
      title: 'Excluir sessão?',
      message: 'A sessão e seus registros serão removidos. Isto não afeta exercícios nem pesos.',
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (!ok) return
    await deleteSession(sessionId, db)
    toast('Sessão excluída.')
    nav(readOnly ? '/sessions' : '/')
  }

  return (
    <>
      <SessionBar
        title={readOnly ? 'Sessão' : 'Treino em andamento'}
        to={readOnly ? '/sessions' : '/'}
        onDelete={onDelete}
      />
      <main className={`screen${readOnly ? '' : ' has-action-bar'}`}>
        <div className="session-hero">
          <span className="session-day">{session.dayName}</span>
          <div className="session-meta">
            {/* Not on a cardio: which gym you ran in is not a property of the
                run, and the chip was the only thing on the screen implying the
                exercise belonged to a place. The session is still stored per
                gym — the Consistência list, which mixes gyms, still names it. */}
            {gym && session.kind !== 'cardio' && (
              <span className="chip accent">
                <Icon name="building" size={12} /> {gym.name}
              </span>
            )}
            <span className="start-time">
              <Icon name="clock" size={12} /> iniciado {relativeDate(session.startedAt).toLowerCase()}
              {/* The counter sits with the start time because it says the same
                  thing twice over: when this began, and how long ago that was. */}
              {!readOnly && (
                <>
                  {' · '}Duração: <span className="session-clock">{fmtClock(elapsed)}</span>
                </>
              )}
            </span>
          </div>
        </div>

        {!readOnly && (
          <div className="progress-row" aria-label="Progresso do treino">
            <div className="progress-head">
              <span>
                <span className="num">{done}</span> de {total} concluídos
              </span>
              <span>{pct}%</span>
            </div>
            <div className="progress-bar" aria-hidden="true">
              <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        <ul className="entries">
          {entries.map((entry) => {
            const cat = catFor(entry)
            return (
              <li key={entry.id} className={`entry${entry.done ? ' done' : ''}`}>
                <button
                  className={`checkbox${entry.done ? ' checked' : ''}${readOnly ? ' readonly' : ''}`}
                  aria-pressed={entry.done}
                  aria-label={`${entry.exerciseName}${entry.done ? ' concluído' : ''}`}
                  onClick={() => onToggle(entry)}
                  disabled={readOnly}
                >
                  {entry.done && <Icon name="check" />}
                </button>
                <Link className="entry-link" to={`/session/${sessionId}/entry/${entry.id}`}>
                  <Media className="thumb" url={mediaFor(entry)} alt={entry.exerciseName} />
                  <span className="entry-body">
                    <span className="entry-name">{entry.exerciseName}</span>
                    {cat && <span className="entry-cat">{cat}</span>}
                  </span>
                  {(() => {
                    // No badge while the gym's targets are unknown — "definir"
                    // would be claiming this exercise has none. Same for the
                    // exercises themselves: until they load we cannot tell a
                    // cardio from a strength entry, and `exMap` answers "unknown"
                    // and "not there" identically (both are a missing key).
                    if (!weights || !exs) return null
                    // And none at all for cardio: there is no load to show, so
                    // "definir" would nag for a number that cannot exist.
                    const ex = entry.exerciseId != null ? exMap.get(entry.exerciseId) : undefined
                    if (ex?.kind === 'cardio') return null
                    const w = entry.exerciseId != null ? weights.get(entry.exerciseId) : undefined
                    return w ? (
                      <span className="used-weight readonly">
                        {fmtNumber(w.value)}
                        <span className="unit">{w.unit}</span>
                      </span>
                    ) : (
                      <span className="used-weight empty">definir</span>
                    )
                  })()}
                  {/* Icon-only "this row opens the detail" affordance — the row
                      already navigates; this just makes that visible. */}
                  <Icon name="chevron-right" className="chev row-chev" />
                </Link>
              </li>
            )
          })}
        </ul>

        {readOnly && (
          <>
            {session.completedAt != null && (
              <div className="session-done-ts">
                <Icon name="check" size={12} /> Concluído {relativeDate(session.completedAt).toLowerCase()} ·{' '}
                {fmtDuration(session.completedAt - session.startedAt)}
              </div>
            )}
            {/* The completed-session share buttons stay in the body (out of scope
                for the floating bar); only the in-progress "Concluir treino" floats. */}
            <div className="share-row">
              <button
                className="btn"
                onClick={() => onShare('full')}
                disabled={sharing != null}
              >
                <Icon name="share" /> {sharing === 'full' ? 'Gerando…' : 'Compartilhar'}
              </button>
              <button
                className="btn"
                onClick={() => onShare('lite')}
                disabled={sharing != null}
              >
                <Icon name="share" /> {sharing === 'lite' ? 'Gerando…' : 'Compartilhar sem pesos'}
              </button>
            </div>
          </>
        )}
      </main>

      {!readOnly && (
        <ActionBar>
          {/* A cardio session has a single entry, so requiring it to be ticked
              before Concluir would ask for the same fact twice — completing it
              marks that entry done (see completeSession). A strength session
              still cannot be completed empty. */}
          <button
            className="btn primary"
            onClick={onComplete}
            disabled={session.kind !== 'cardio' && done === 0}
          >
            <Icon name="check" /> Concluir treino
          </button>
          {/* Only when the button is actually gated. On a cardio session it is
              not, so the hint would contradict an enabled button. */}
          {done === 0 && session.kind !== 'cardio' && (
            <p className="complete-hint">Marque ao menos um exercício para concluir.</p>
          )}
        </ActionBar>
      )}
    </>
  )
}

function SessionBar({
  title = 'Sessão',
  to = '/',
  onDelete,
}: {
  title?: string
  to?: string
  onDelete?: () => void
}) {
  const nav = useNavigate()
  return (
    <header className="appbar">
      <button className="icon-btn ghost" aria-label="Voltar" onClick={() => nav(to)}>
        <Icon name="arrow-left" />
      </button>
      <h1>{title}</h1>
      <span className="spacer" />
      {onDelete && (
        <button className="icon-btn ghost" aria-label="Excluir sessão" onClick={onDelete}>
          <Icon name="trash" />
        </button>
      )}
    </header>
  )
}
