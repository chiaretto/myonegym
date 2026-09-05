import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { deleteHistoryEntry, resolveWeight, saveWeight } from '../../db/repos'
import { UNITS, type Unit } from '../../db/types'
import { fmtNumber, fmtWeight, historyDelta, relativeDate } from '../../lib/format'
import { useGyms, useHistory, useWeightByGym } from '../../lib/hooks'
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

  const [editing, setEditing] = useState(false)
  // The history opens in a modal, from a button on the card. Always shut on
  // arrival and never persisted: the question this screen answers between sets
  // is "how much do I lift", and the answer has to be visible without scrolling
  // past three months of it first.
  const [historyOpen, setHistoryOpen] = useState(false)
  /**
   * Which gym's timeline the modal is showing. Starts on the one the user is in
   * and resets when the modal closes: switching it is a **lookup**, not a change
   * of the gym the screen behind is about.
   */
  const [historyGymId, setHistoryGymId] = useState<number | null>(null)
  /** Whether the gym list is showing inside the modal. Inline rather than a
   *  nested Sheet: two stacked dialogs would both answer Escape and both dim
   *  the screen, for a list of a handful of names. */
  const [gymPickerOpen, setGymPickerOpen] = useState(false)

  /**
   * The modal can be pointed at any gym, so its weight and timeline are read
   * for the **viewed** gym rather than the active one. Everything outside the
   * modal keeps reading `gymId`: the card, the editor and the save are about
   * the gym the user is training in, and the selector must not move that.
   */
  const viewedGymId = historyGymId ?? gymId
  const viewedResolved = useLiveQuery(
    async () =>
      viewedGymId == null || exerciseId == null
        ? undefined
        : resolveWeight(viewedGymId, exerciseId, db),
    [viewedGymId, exerciseId],
  )
  const viewedWeight = viewedResolved?.weight
  const viewedIsException = viewedResolved?.scope === 'gym'
  const viewedGym = gyms?.find((g) => g.id === viewedGymId)
  // Every gym's weight for this exercise, in one read — the picker shows them
  // all so the user can compare without switching into each.
  const weightPerGym = useWeightByGym(exerciseId)
  const viewedRows = useHistory(viewedGymId, exerciseId)
  // The active gym's list is already loaded, so switching back to it paints in
  // the same frame instead of blanking the modal for one.
  const viewedHistory = (viewedGymId === gymId ? history : viewedRows) ?? []
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

  /**
   * The way out to the past. Rendered in two places, which is the point: on the
   * card's top line in the same quiet register as the "Peso alvo" eyebrow, and
   * again on the edit popup's title line — checking what you lifted last time is
   * exactly the thing you want while deciding what to type, and the popup covers
   * the card it used to sit on.
   */
  const historyButton =
    history && history.length > 0 ? (
      <button className="wc-history-btn" onClick={() => setHistoryOpen(true)}>
        <Icon name="history" size={13} /> Histórico
        {/* The count answers "is there anything in there?" before the modal
            costs a tap. */}
        <span className="wc-history-count">{history.length}</span>
      </button>
    ) : null

  return (
    <>
      <section className="weight-card">
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
            {historyButton}
          </span>
        </div>

        <div className="wc-view">
          <span className="wc-value">{current ? fmtWeight(current.value, current.unit) : '—'}</span>
          {canEdit && (
            <button className="btn subtle" style={{ width: 'auto' }} onClick={() => setEditing(true)}>
              <Icon name="pencil" /> {current ? 'Editar' : 'Definir'}
            </button>
          )}
        </div>
      </section>

      {/* The editor is a popup anchored to the TOP, not a card that grows.
          Inline, it pushed Salvar below the fold the moment it opened — the card
          sits under the media, and opening it added a stepper, the units, the
          scope checkbox and two actions. That was patched with a scroll-to-top,
          which fought the autofocus and still left the layout jumping.

          Top rather than bottom because the field is typed into: the keyboard
          takes the lower half of the screen, and a bottom sheet would open with
          its own Salvar underneath it. */}
      {editing && (
        <Sheet
          title="Peso alvo"
          placement="top"
          action={historyButton}
          onClose={() => setEditing(false)}
        >
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
        </Sheet>
      )}

      {/* A modal, not a panel on the card: the timeline is as long as the user
          has trained, and the card's job is to answer "how much do I lift" in
          one glance. Given its own screen it can be as long as it likes.

          The condition covers deleting the last entry from inside: with nothing
          left to show, the modal closes itself rather than standing empty. */}
      {historyOpen && history && history.length > 0 && (
        <Sheet
          title="Histórico"
          onClose={() => {
            setHistoryOpen(false)
            setHistoryGymId(null)
            setGymPickerOpen(false)
          }}
          // Beside the title, not above the timeline: it says which gym is being
          // read, and changing it is the same gesture Home uses to change the
          // active one — the same pill, so it is recognised rather than learned.
          action={
            (gyms?.length ?? 0) > 1 ? (
              <button
                className="chip accent hist-gym-btn"
                aria-label="Ver outra academia"
                aria-expanded={gymPickerOpen}
                onClick={() => setGymPickerOpen((v) => !v)}
              >
                <i className="png-ic pi-building" aria-hidden />
                {viewedGym?.name ?? 'Academia'}
                <i className="png-ic pi-chevron-down" aria-hidden />
              </button>
            ) : null
          }
        >
          <div className="history">
            {gymPickerOpen && (
              <div className="group hist-gym-list" role="group" aria-label="Academias">
                {gyms?.map((g) => (
                  <button
                    key={g.id}
                    className="row"
                    onClick={() => {
                      setHistoryGymId(g.id!)
                      setGymPickerOpen(false)
                    }}
                  >
                    <span className="row-ic">
                      <Icon name="building" />
                    </span>
                    <span className="row-body">
                      <span className="row-title">{g.name}</span>
                    </span>
                    {/* What that gym lifts, on the row itself. The list exists to
                        be compared, and a comparison that costs a tap per gym —
                        and loses the previous number on the way — is not one. */}
                    <span className="hist-gym-weight">
                      {(() => {
                        const w = weightPerGym?.get(g.id!)?.weight
                        return w ? fmtWeight(w.value, w.unit) : '—'
                      })()}
                    </span>
                    {g.id === viewedGymId && <Icon name="check" className="chev" />}
                  </button>
                ))}
              </div>
            )}

            {/* Which weight this timeline belongs to. Load-bearing, not a label:
                a gym with no exception of its own resolves to the GLOBAL weight,
                so two gyms can show the very same entries — and without this
                line that repetition reads as a bug rather than as the point. */}
            <p className="hist-scope">
              {viewedIsException ? (
                <>
                  <Icon name="building" size={12} /> Peso só desta academia
                </>
              ) : (
                <>
                  <Icon name="world" size={12} /> Peso global, valendo em todas as academias
                </>
              )}
              {viewedWeight && <strong> · {fmtWeight(viewedWeight.value, viewedWeight.unit)}</strong>}
            </p>

            <Sparkline history={viewedHistory} />
            <ul className="timeline">
              {viewedHistory.map((entry, i) => {
                const prev = viewedHistory[i + 1]
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
                      {/* Only the gym the screen is actually about. Looking at
                          another one is a lookup, and a delete reachable from a
                          lookup is a delete nobody meant to make. */}
                      {canEdit && viewedGymId === gymId && (
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
