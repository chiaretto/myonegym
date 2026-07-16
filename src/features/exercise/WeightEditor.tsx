import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { deleteHistoryEntry, getWeight, saveWeight } from '../../db/repos'
import { UNITS, type Unit } from '../../db/types'
import { fmtNumber, fmtWeight, historyDelta, relativeDate } from '../../lib/format'
import { useGyms, useHistory } from '../../lib/hooks'
import { useConfirm, useToast } from '../../ui/Feedback'
import { Icon } from '../../ui/Icon'
import { Sparkline } from './Sparkline'

/** Step a weight string by ±0.5, clamped at 0 and snapped to a clean half-step. */
function stepValue(current: string, delta: number): string {
  const n = Number(current.replace(',', '.'))
  const base = Number.isFinite(n) ? n : 0
  return String(Math.max(0, Math.round((base + delta) * 2) / 2))
}

/**
 * The per-gym **target weight** editor (Peso alvo card + weight-history timeline).
 * One editor shared by the catalog exercise detail and the in-session exercise
 * detail — both edit the same `(gymId, exerciseId)` target and its history.
 * `readOnly` (e.g. a completed session) shows the current target for reference,
 * with no edit or history delete.
 */
export function WeightEditor({
  gymId,
  exerciseId,
  readOnly = false,
}: {
  gymId: number | null
  exerciseId: number | null
  readOnly?: boolean
}) {
  const gyms = useGyms()
  const gym = gyms?.find((g) => g.id === gymId)
  const current = useLiveQuery(
    async () =>
      gymId == null || exerciseId == null ? undefined : getWeight(gymId, exerciseId, db),
    [gymId, exerciseId],
  )
  const history = useHistory(gymId, exerciseId)
  const toast = useToast()
  const confirm = useConfirm()

  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState<Unit>('KG')

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
  }, [current, gymId])

  if (gymId == null) {
    return (
      <section className="weight-card">
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Crie ou selecione uma academia para registrar o peso deste exercício.
        </p>
      </section>
    )
  }

  // A weight can only be set for a real exercise, and never in read-only mode.
  const canEdit = !readOnly && exerciseId != null

  const onSave = async () => {
    const num = Number(value.replace(',', '.'))
    if (!Number.isFinite(num) || num < 0) {
      toast('Informe um peso válido.')
      return
    }
    if (exerciseId == null) return
    await saveWeight(gymId, exerciseId, num, unit, db)
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
      <section className="weight-card">
        <div className="wc-head">
          <span className="wc-label">Peso alvo</span>
          {gym && (
            <span className="chip accent">
              <Icon name="building" size={12} /> {gym.name}
            </span>
          )}
        </div>

        {!editing ? (
          <div className="wc-view">
            <span className="wc-value">{current ? fmtWeight(current.value, current.unit) : '—'}</span>
            {canEdit && (
              <button className="btn subtle" style={{ width: 'auto' }} onClick={() => setEditing(true)}>
                <Icon name="pencil" /> {current ? 'Editar' : 'Definir'}
              </button>
            )}
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
            {history.map((entry, i) => {
              const prev = history[i + 1]
              const delta = historyDelta(entry, prev)
              const isCurrent = i === 0
              return (
                <li key={entry.id} className={`tl-item${isCurrent ? ' current' : ''}`}>
                  <span className="tl-dot" />
                  <div className="tl-content">
                    <div className="tl-left">
                      <span className="tl-value">
                        {fmtNumber(entry.value)} <span className="u">{entry.unit}</span>
                      </span>
                      <span className="tl-date">{relativeDate(entry.changedAt)}</span>
                    </div>
                    <span className={`tl-delta ${delta.direction}`}>
                      {delta.direction === 'up' && <Icon name="arrow-up" size={11} />}
                      {delta.direction === 'down' && <Icon name="arrow-down" size={11} />}
                      {delta.text}
                    </span>
                    {canEdit && (
                      <button
                        className="tl-delete"
                        aria-label="Excluir registro"
                        onClick={() => onDeleteEntry(entry.id!, isCurrent)}
                      >
                        <Icon name="trash" />
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </>
  )
}
