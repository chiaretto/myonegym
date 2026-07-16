import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db } from '../../db/db'
import { setEntryDone, setEntryWeight } from '../../db/repos'
import { UNITS, type Unit } from '../../db/types'
import { fmtNumber, fmtWeight, historyDelta, relativeDate } from '../../lib/format'
import {
  useCategoryMap,
  useExerciseMap,
  useGyms,
  useHistory,
  useSession,
  useSessionEntries,
  useSessionEntry,
} from '../../lib/hooks'
import { BackBar } from '../../ui/Chrome'
import { useToast } from '../../ui/Feedback'
import { Icon } from '../../ui/Icon'
import { Media } from '../../ui/Media'
import { Tabs } from '../../ui/Tabs'
import { NoteEditor } from '../exercise/NoteEditor'
import { Sparkline } from '../exercise/Sparkline'
import '../exercise/exercise.css'
import './session.css'

type EntryTab = 'exec' | 'notes'

export function SessionEntryPage() {
  const { id, entryId } = useParams()
  const sessionId = Number(id)
  const eId = Number(entryId)
  const session = useSession(sessionId)
  const entry = useSessionEntry(eId)
  const entries = useSessionEntries(sessionId)
  const gyms = useGyms()
  const exMap = useExerciseMap()
  const catMap = useCategoryMap()
  const toast = useToast()
  const nav = useNavigate()

  const gymId = session?.gymId ?? null
  const exerciseId = entry?.exerciseId ?? null
  const history = useHistory(gymId, exerciseId)

  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState<Unit>('KG')
  const [tab, setTab] = useState<EntryTab>('exec')

  // Seed the editor from the entry's used weight whenever it changes.
  useEffect(() => {
    if (entry?.usedValue != null) {
      setValue(String(entry.usedValue))
      setUnit(entry.usedUnit ?? 'KG')
    } else {
      setValue('')
      setUnit('KG')
    }
    setEditing(false)
  }, [entry?.usedValue, entry?.usedUnit])

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
  const gym = gyms?.find((g) => g.id === session.gymId)
  const cat = exercise?.categoryId != null ? catMap.get(exercise.categoryId) : undefined

  const onSave = async () => {
    const num = Number(value.replace(',', '.'))
    if (!Number.isFinite(num) || num < 0) {
      toast('Informe um peso válido.')
      return
    }
    await setEntryWeight(eId, num, unit, db)
    setEditing(false)
    toast('Peso salvo.')
  }

  // Guided stepper over the session's exercises (in list order).
  const idx = entries.findIndex((e) => e.id === eId)
  const prevId = idx > 0 ? entries[idx - 1].id : undefined
  const nextId = idx >= 0 && idx < entries.length - 1 ? entries[idx + 1].id : undefined
  const goTo = (id: number) => nav(`/session/${sessionId}/entry/${id}`)

  const onCompleteAndAdvance = async () => {
    if (readOnly) return
    await setEntryDone(eId, true, db)
    if (nextId != null) goTo(nextId)
    else nav(`/session/${sessionId}`) // last exercise → back to the runner
  }

  return (
    <>
      <BackBar title={entry.exerciseName} to={backTo} />
      <main className="screen">
        <div className="hero">
          <Media url={exercise?.mediaUrl} alt={entry.exerciseName} className="hero-media" />
        </div>

        <div className="ex-head">
          <h2 className="ex-title">{entry.exerciseName}</h2>
          <div className="ex-chips">
            {entry.done && (
              <span className="chip accent">
                <Icon name="check" size={12} /> Concluído
              </span>
            )}
            {cat && (
              <span className="chip">
                <Icon name="tag" size={12} /> {cat.name}
              </span>
            )}
            <span className="chip">
              <Icon name="calendar-event" size={12} /> {session.dayName}
            </span>
          </div>
        </div>

        <Tabs<EntryTab>
          tabs={[
            { id: 'exec', label: 'Execução' },
            { id: 'notes', label: 'Observações' },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'notes' ? (
          <NoteEditor gymId={session.gymId} exerciseId={entry.exerciseId ?? null} />
        ) : (
          <>
        {/* Guided stepper: Concluído (mark + advance) on top, Voltar/Avançar below */}
        <div className="entry-stepper">
          {readOnly ? (
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
          )}
          <div className="entry-nav-row">
            <button
              className="btn subtle"
              aria-label="Exercício anterior"
              disabled={prevId == null}
              onClick={() => prevId != null && goTo(prevId)}
            >
              <Icon name="chevron-left" /> Voltar
            </button>
            <button
              className="btn subtle"
              aria-label="Próximo exercício"
              disabled={nextId == null}
              onClick={() => nextId != null && goTo(nextId)}
            >
              Avançar <Icon name="chevron-right" />
            </button>
          </div>
        </div>

        {/* Used weight for this session entry */}
        <section className="weight-card">
          <div className="wc-head">
            <span className="wc-label">Peso usado</span>
            {gym && (
              <span className="chip accent">
                <Icon name="building" size={12} /> {gym.name}
              </span>
            )}
          </div>

          {!editing ? (
            <div className="wc-view">
              <span className="wc-value">
                {entry.usedValue != null ? fmtWeight(entry.usedValue, entry.usedUnit!) : '—'}
              </span>
              {!readOnly && (
                <button className="btn subtle" style={{ width: 'auto' }} onClick={() => setEditing(true)}>
                  <Icon name="pencil" /> {entry.usedValue != null ? 'Editar' : 'Definir'}
                </button>
              )}
            </div>
          ) : (
            <div className="wc-edit">
              <input
                className="wc-input"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.5"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                aria-label="Peso usado"
                autoFocus
              />
              <div className="unit-seg" role="group" aria-label="Unidade">
                {UNITS.map((u) => (
                  <button key={u} className={u === unit ? 'on' : ''} aria-pressed={u === unit} onClick={() => setUnit(u)}>
                    {u}
                  </button>
                ))}
              </div>
              <div className="sheet-actions">
                <button className="btn subtle" onClick={() => setEditing(false)}>
                  Cancelar
                </button>
                <button className="btn primary" onClick={onSave}>
                  <Icon name="device-floppy" /> Salvar
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Per-gym target-weight history (read-only reference) */}
        {history.length > 0 && (
          <section className="history">
            <div className="section-head">
              <h3>
                <Icon name="history" size={16} /> Histórico
                <span className="count"> · nesta academia</span>
              </h3>
            </div>
            <Sparkline history={history} />
            <ul className="timeline">
              {history.map((h, i) => {
                const prev = history[i + 1]
                const delta = historyDelta(h, prev)
                const isCurrent = i === 0
                return (
                  <li key={h.id} className={`tl-item${isCurrent ? ' current' : ''}`}>
                    <span className="tl-dot" />
                    <div className="tl-content">
                      <div className="tl-left">
                        <span className="tl-value">
                          {fmtNumber(h.value)} <span className="u">{h.unit}</span>
                        </span>
                        <span className="tl-date">{relativeDate(h.changedAt)}</span>
                      </div>
                      <span className={`tl-delta ${delta.direction}`}>
                        {delta.direction === 'up' && <Icon name="arrow-up" size={11} />}
                        {delta.direction === 'down' && <Icon name="arrow-down" size={11} />}
                        {delta.text}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
          </>
        )}
      </main>
    </>
  )
}
