import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useParams } from 'react-router-dom'
import { db } from '../../db/db'
import { deleteHistoryEntry, getWeight, saveWeight } from '../../db/repos'
import { UNITS, type Unit } from '../../db/types'
import { fmtNumber, fmtWeight, historyDelta, relativeDate } from '../../lib/format'
import { useCategoryMap, useDays, useHistory } from '../../lib/hooks'
import { useActiveGym } from '../../state/activeGym'
import { useConfirm, useToast } from '../../ui/Feedback'
import { Icon } from '../../ui/Icon'
import { Media } from '../../ui/Media'
import { BackBar } from '../../ui/Chrome'
import { Tabs } from '../../ui/Tabs'
import { useGyms } from '../../lib/hooks'
import { NoteEditor } from './NoteEditor'
import { Sparkline } from './Sparkline'
import './exercise.css'

type DetailTab = 'detail' | 'notes'

/** Step a weight string by ±0.5, clamped at 0 and snapped to a clean half-step. */
function stepValue(current: string, delta: number): string {
  const n = Number(current.replace(',', '.'))
  const base = Number.isFinite(n) ? n : 0
  return String(Math.max(0, Math.round((base + delta) * 2) / 2))
}

export function ExerciseDetailPage() {
  const { id } = useParams()
  const exerciseId = Number(id)
  const exercise = useLiveQuery(() => db.exercises.get(exerciseId), [exerciseId])
  const catMap = useCategoryMap()
  const days = useDays()
  const gyms = useGyms()
  const activeGymId = useActiveGym((s) => s.activeGymId)
  const activeGym = gyms?.find((g) => g.id === activeGymId)

  const current = useLiveQuery(
    async () => (activeGymId == null ? undefined : getWeight(activeGymId, exerciseId, db)),
    [activeGymId, exerciseId],
  )
  const history = useHistory(activeGymId, exerciseId)
  const toast = useToast()
  const confirm = useConfirm()

  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState<Unit>('KG')
  const [tab, setTab] = useState<DetailTab>('detail')

  // Seed the editor from the current weight whenever it (or gym) changes.
  useEffect(() => {
    if (current) {
      setValue(String(current.value))
      setUnit(current.unit)
    } else {
      setValue('')
      setUnit('KG')
    }
    setEditing(false)
  }, [current, activeGymId])

  const inDays = useMemo(
    () => (days ?? []).filter((day) => day.exerciseIds.includes(exerciseId)),
    [days, exerciseId],
  )
  const cat = exercise?.categoryId != null ? catMap.get(exercise.categoryId) : undefined

  if (exercise === undefined) return <BackBar title="Exercício" to="/" />
  if (exercise === null) {
    return (
      <>
        <BackBar title="Exercício" to="/" />
        <div className="empty">
          <p>Exercício não encontrado.</p>
        </div>
      </>
    )
  }

  const onSave = async () => {
    const num = Number(value.replace(',', '.'))
    if (!Number.isFinite(num) || num < 0) {
      toast('Informe um peso válido.')
      return
    }
    await saveWeight(activeGymId!, exerciseId, num, unit, db)
    setEditing(false)
    toast('Peso salvo.')
  }

  const onDeleteEntry = async (entryId: number, isCurrent: boolean) => {
    const ok = await confirm({
      title: 'Excluir registro?',
      message: isCurrent
        ? 'Este é o registro atual. O peso voltará para o registro anterior (ou ficará vazio).'
        : 'O registro será removido do histórico.',
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (!ok) return
    await deleteHistoryEntry(entryId, db)
    toast('Registro excluído.')
  }

  return (
    <>
      <BackBar title={exercise.name} to="/" />
      <main className="screen">
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
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'notes' ? (
          <NoteEditor gymId={activeGymId ?? null} exerciseId={exerciseId} />
        ) : (
          <>
        {/* Weight editor */}
        {activeGymId == null ? (
          <section className="weight-card">
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Crie ou selecione uma academia para registrar o peso deste exercício.
            </p>
          </section>
        ) : (
          <section className="weight-card">
            <div className="wc-head">
              <span className="wc-label">Peso alvo</span>
              <span className="chip accent">
                <Icon name="building" size={12} /> {activeGym?.name}
              </span>
            </div>

            {!editing ? (
              <div className="wc-view">
                <span className="wc-value">
                  {current ? fmtWeight(current.value, current.unit) : '—'}
                </span>
                <button className="btn subtle" style={{ width: 'auto' }} onClick={() => setEditing(true)}>
                  <Icon name="pencil" /> {current ? 'Editar' : 'Definir'}
                </button>
              </div>
            ) : (
              <div className="wc-edit">
                <div className="wc-stepper">
                  <button
                    type="button"
                    className="step-btn"
                    aria-label="Diminuir peso"
                    onClick={() => setValue(stepValue(value, -0.5))}
                  >
                    <Icon name="minus" />
                  </button>
                  <input
                    className="wc-input"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.5"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    aria-label="Peso"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="step-btn accent"
                    aria-label="Aumentar peso"
                    onClick={() => setValue(stepValue(value, 0.5))}
                  >
                    <Icon name="plus" />
                  </button>
                </div>
                <div className="unit-seg" role="group" aria-label="Unidade">
                  {UNITS.map((u) => (
                    <button
                      key={u}
                      className={u === unit ? 'on' : ''}
                      aria-pressed={u === unit}
                      onClick={() => setUnit(u)}
                    >
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
        )}

        {/* History */}
        {activeGymId != null && history.length > 0 && (
          <section className="history">
            <div className="section-head">
              <h3>
                <Icon name="history" size={16} /> Histórico
                <span className="count"> · nesta academia</span>
              </h3>
            </div>
            <Sparkline history={history} />
            <ul className="timeline">
              {history.map((entry, i) => {
                const prev = history[i + 1]
                const delta = historyDelta(entry, prev)
                const isCurrent = i === 0
                return (
                  <li key={entry.id} className={`tl-item${isCurrent ? ' current' : ''}`}>
                    <span className="tl-dot" />
                    <div className="tl-content">
                      <div className="tl-left">
                        <span className="tl-value">{fmtNumber(entry.value)} <span className="u">{entry.unit}</span></span>
                        <span className="tl-date">{relativeDate(entry.changedAt)}</span>
                      </div>
                      <span className={`tl-delta ${delta.direction}`}>
                        {delta.direction === 'up' && <Icon name="arrow-up" size={11} />}
                        {delta.direction === 'down' && <Icon name="arrow-down" size={11} />}
                        {delta.text}
                      </span>
                      <button
                        className="tl-delete"
                        aria-label="Excluir registro"
                        onClick={() => onDeleteEntry(entry.id!, isCurrent)}
                      >
                        <Icon name="trash" />
                      </button>
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
