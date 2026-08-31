import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { deleteHistoryEntry, resolveWeight, saveWeight } from '../../db/repos'
import { UNITS, type Unit } from '../../db/types'
import { fmtNumber, fmtWeight, historyDelta, relativeDate } from '../../lib/format'
import { useGyms, useHistory } from '../../lib/hooks'
import { useConfirm, useToast } from '../../ui/Feedback'
import { Icon } from '../../ui/Icon'
import { Sheet } from '../../ui/Sheet'
import { Sparkline } from './Sparkline'

/** Step a weight string by ±0.5, clamped at 0 and snapped to a clean half-step. */
function stepValue(current: string, delta: number): string {
  const n = Number(current.replace(',', '.'))
  const base = Number.isFinite(n) ? n : 0
  return String(Math.max(0, Math.round((base + delta) * 2) / 2))
}

/**
 * The **target weight** editor (Peso alvo card + weight-history timeline).
 * One editor shared by the catalog exercise detail and the in-session exercise
 * detail — both show the weight that applies to this gym and its history.
 *
 * A weight is **global** by default: saving changes it for every gym. The
 * "Só nessa academia" checkbox turns the save into an **exception** for the
 * active gym, and clearing it hands the pair back to the global weight. The
 * gym's name is shown only while an exception is in effect — a label on every
 * weight would say nothing, and here it means "this one is different".
 *
 * `readOnly` (e.g. a completed session) shows the weight in effect for
 * reference, with no edit, no history delete and no checkbox.
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
  const resolved = useLiveQuery(
    async () =>
      gymId == null || exerciseId == null ? undefined : resolveWeight(gymId, exerciseId, db),
    [gymId, exerciseId],
  )
  const current = resolved?.weight
  // Until the lookup answers, assume global — that is the shape of every weight
  // that has no exception, and it keeps the card from flashing a gym label.
  const isException = resolved?.scope === 'gym'
  const history = useHistory(gymId, exerciseId)
  const toast = useToast()
  const confirm = useConfirm()

  const cardRef = useRef<HTMLElement>(null)

  const [editing, setEditing] = useState(false)
  // The history opens in a modal, from a button on the card. Always shut on
  // arrival and never persisted: the question this screen answers between sets
  // is "how much do I lift", and the answer has to be visible without scrolling
  // past three months of it first.
  const [historyOpen, setHistoryOpen] = useState(false)
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState<Unit>('KG')
  const [onlyHere, setOnlyHere] = useState(false)

  // Seed the editor from the weight in effect whenever it (or gym) changes.
  // The checkbox starts on the CURRENT scope: unchecked on a global weight,
  // checked wherever this gym already has an exception.
  useEffect(() => {
    if (current) {
      setValue(String(current.value))
      setUnit(current.unit)
    } else {
      setValue('')
      setUnit('KG')
    }
    setOnlyHere(isException)
    setEditing(false)
  }, [current, isException, gymId])

  // Opening the editor brings the card as near the top as the scroll extent
  // allows. It sits below the media and the warm-up and it GROWS when it opens
  // — stepper, units, "Só nessa academia", actions — which used to push Salvar
  // under the fixed bar: the user typed a weight and could not see where to
  // save it. `block: 'start'` also covers the card that is already near the
  // bottom of a short page, where the browser scrolls as far as it can and the
  // actions come into view that way.
  //
  // After a frame, not immediately: the input carries autoFocus, and the scroll
  // focusing brings with it would land on top of ours and undo it.
  // `scroll-margin-top` on the card is what keeps it clear of the sticky app bar.
  useEffect(() => {
    if (!editing) return
    const raf = requestAnimationFrame(() =>
      cardRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }),
    )
    return () => cancelAnimationFrame(raf)
  }, [editing])

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
    await saveWeight(gymId, exerciseId, num, unit, onlyHere ? 'gym' : 'global', db)
    setEditing(false)
    toast(
      onlyHere
        ? 'Peso salvo só nesta academia.'
        : isException
          ? 'Peso salvo para todas as academias.'
          : 'Peso salvo.',
    )
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
      <section className="weight-card" ref={cardRef}>
        <div className="wc-head">
          <span className="wc-label">Peso alvo</span>
          <span className="wc-head-right">
            {/* Only an exception is labelled: a global weight is just the
                exercise's weight, and naming a gym on it would be noise. */}
            {gym && isException && (
              <span className="chip accent">
                <Icon name="building" size={12} /> {gym.name}
              </span>
            )}
            {/* On the card's top line, in the same quiet register as the "Peso
                alvo" eyebrow beside it: a way out to the past, not a second
                thing to do with the weight. Loud enough to be a control, never
                loud enough to compete with the figure below it.

                Present while EDITING too. It was hidden there while the history
                expanded the card — that pushed Cancelar and Salvar back below
                the fold, which the scroll-to-top exists to prevent. From the top
                line, opening a modal, it costs the edit form no height at all,
                and checking what you lifted last time is exactly the thing you
                want while deciding what to type. */}
            {history && history.length > 0 && (
              <button className="wc-history-btn" onClick={() => setHistoryOpen(true)}>
                <Icon name="history" size={13} /> Histórico
                {/* The count answers "is there anything in there?" before the
                    modal costs a tap. */}
                <span className="wc-history-count">{history.length}</span>
              </button>
            )}
          </span>
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
            <label className="wc-scope">
              <input
                type="checkbox"
                checked={onlyHere}
                onChange={(e) => setOnlyHere(e.target.checked)}
              />
              <span className="wc-scope-text">
                <strong>Só nessa academia</strong>
                <small>
                  {onlyHere
                    ? `Vale apenas ${gym ? `na ${gym.name}` : 'aqui'}; as outras seguem o peso geral.`
                    : 'Salva o peso do exercício para todas as academias.'}
                </small>
              </span>
            </label>
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

      {/* A modal, not a panel on the card: the timeline is as long as the user
          has trained, and the card's job is to answer "how much do I lift" in
          one glance. Given its own screen it can be as long as it likes.

          The condition covers deleting the last entry from inside: with nothing
          left to show, the modal closes itself rather than standing empty. */}
      {historyOpen && history && history.length > 0 && (
        <Sheet
          // Only an exception is qualified — a global history belongs to no gym
          // in particular, so there would be nothing to name.
          title={isException ? 'Histórico · nesta academia' : 'Histórico'}
          onClose={() => setHistoryOpen(false)}
        >
          <div className="history">
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
          </div>
        </Sheet>
      )}
    </>
  )
}
