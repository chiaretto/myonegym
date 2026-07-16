import { useEffect, useState } from 'react'
import { db } from '../../db/db'
import { saveNote } from '../../db/repos'
import { useNote } from '../../lib/hooks'
import { useToast } from '../../ui/Feedback'
import { Icon } from '../../ui/Icon'

/**
 * Editor for the per-gym exercise note (Observações tab). One note per
 * `(gymId, exerciseId)`; saving blank text clears it. Shows a hint instead of
 * the field when the gym or exercise is unavailable (no active gym / deleted
 * source exercise).
 */
export function NoteEditor({
  gymId,
  exerciseId,
}: {
  gymId: number | null
  exerciseId: number | null
}) {
  const note = useNote(gymId, exerciseId)
  const toast = useToast()
  const [text, setText] = useState('')

  // Seed the field from the saved note whenever it changes.
  useEffect(() => {
    setText(note?.text ?? '')
  }, [note?.text])

  if (gymId == null) {
    return (
      <section className="note-card">
        <p className="note-empty">
          Crie ou selecione uma academia para anotar uma observação deste exercício.
        </p>
      </section>
    )
  }
  if (exerciseId == null) {
    return (
      <section className="note-card">
        <p className="note-empty">
          Exercício indisponível — não é possível anotar uma observação.
        </p>
      </section>
    )
  }

  const saved = note?.text ?? ''
  const dirty = text.trim() !== saved

  const onSave = async () => {
    await saveNote(gymId, exerciseId, text, db)
    toast(text.trim() ? 'Observação salva.' : 'Observação removida.')
  }

  return (
    <section className="note-card">
      <textarea
        className="note-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ex.: manter cotovelo fixo, usar pegada aberta…"
        aria-label="Observações"
      />
      <div className="sheet-actions">
        <button className="btn primary" onClick={onSave} disabled={!dirty}>
          <Icon name="device-floppy" /> Salvar
        </button>
      </div>
    </section>
  )
}
