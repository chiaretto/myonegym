import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../../db/db'
import { completeSession, deleteSession, setEntryDone } from '../../db/repos'
import type { SessionEntry } from '../../db/types'
import { fmtDuration, fmtNumber, relativeDate } from '../../lib/format'
import { useCategoryMap, useExerciseMap, useGyms, useSession, useSessionEntries } from '../../lib/hooks'
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
  const exMap = useExerciseMap()
  const catMap = useCategoryMap()
  const toast = useToast()
  const confirm = useConfirm()
  const nav = useNavigate()

  if (session === undefined) return <SessionBar onDelete={undefined} />
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
    return ex?.categoryId != null ? catMap.get(ex.categoryId)?.name : undefined
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
    nav('/sessions')
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
      <main className="screen">
        <div className="session-hero">
          <span className="session-day">{session.dayName}</span>
          <div className="session-meta">
            {gym && (
              <span className="chip accent">
                <Icon name="building" size={12} /> {gym.name}
              </span>
            )}
            <span className="start-time">
              <Icon name="clock" size={12} /> iniciado {relativeDate(session.startedAt).toLowerCase()}
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
                  {entry.usedValue != null ? (
                    <span className="used-weight readonly">
                      {fmtNumber(entry.usedValue)}
                      <span className="unit">{entry.usedUnit}</span>
                    </span>
                  ) : (
                    <span className="used-weight empty">definir</span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>

        {!readOnly ? (
          <button className="btn primary" style={{ marginTop: 14 }} onClick={onComplete}>
            <Icon name="check" /> Concluir treino
          </button>
        ) : (
          session.completedAt != null && (
            <div className="session-done-ts">
              <Icon name="check" size={12} /> Concluído {relativeDate(session.completedAt).toLowerCase()} ·{' '}
              {fmtDuration(session.completedAt - session.startedAt)}
            </div>
          )
        )}
      </main>
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
