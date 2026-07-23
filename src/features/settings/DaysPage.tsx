import { useState } from 'react'
import { createDay, deleteDay, reorderDays, updateDay, ValidationError } from '../../db/repos'
import { db } from '../../db/db'
import type { Day, Exercise } from '../../db/types'
import { useCategoryMap, useExerciseMap, useExercises, useDays } from '../../lib/hooks'
import { daySubtitle } from '../../lib/days'
import { ActionBar } from '../../ui/ActionBar'
import { BackBar } from '../../ui/Chrome'
import { useConfirm, useToast } from '../../ui/Feedback'
import { Icon } from '../../ui/Icon'
import { Media } from '../../ui/Media'
import { Sheet } from '../../ui/Sheet'
import '../exercise/exercise.css'

export function DaysPage() {
  const days = useDays()
  const catMap = useCategoryMap()
  const exMap = useExerciseMap()
  const toast = useToast()
  const confirm = useConfirm()
  const [editing, setEditing] = useState<Day | 'new' | null>(null)

  const onDelete = async (day: Day) => {
    const ok = await confirm({ title: `Excluir "${day.name}"?`, confirmLabel: 'Excluir', danger: true })
    if (!ok) return
    await deleteDay(day.id!, db)
    toast('Dia excluído.')
  }

  const moveDay = async (i: number, dir: -1 | 1) => {
    if (!days) return
    const j = i + dir
    if (j < 0 || j >= days.length) return
    const ids = days.map((x) => x.id!)
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    await reorderDays(ids, db)
  }

  // The day's icon + name area doubles as the edit button (tap to edit).
  const dayEditStyle = {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'none',
    border: 0,
    textAlign: 'left',
    color: 'inherit',
    padding: 0,
  } as const

  return (
    <>
      <BackBar title="Dias de treino" to="/settings" />
      <main className="screen has-action-bar">
        {days && days.length === 0 && (
          <div className="empty">
            <span className="big">🗓️</span>
            <h2>Nenhum dia de treino</h2>
            <p>Crie dias (ex.: "Dia 1") e escolha quais exercícios entram em cada um.</p>
          </div>
        )}

        <div className="group">
          {days?.map((day, i) => (
            <div key={day.id} className="row">
              <button style={dayEditStyle} aria-label={`Editar ${day.name}`} onClick={() => setEditing(day)}>
                <span className="row-ic">
                  <Icon name="calendar-event" />
                </span>
                <span className="row-body">
                  <span className="row-title">{day.name}</span>
                  <span className="row-sub">{daySubtitle(day, exMap, catMap)}</span>
                </span>
              </button>
              <button
                className="icon-btn ghost"
                aria-label={`Subir ${day.name}`}
                disabled={i === 0}
                onClick={() => moveDay(i, -1)}
              >
                <Icon name="chevron-up" />
              </button>
              <button
                className="icon-btn ghost"
                aria-label={`Descer ${day.name}`}
                disabled={i === days.length - 1}
                onClick={() => moveDay(i, 1)}
              >
                <Icon name="chevron-down" />
              </button>
              <button className="icon-btn ghost" aria-label={`Excluir ${day.name}`} onClick={() => onDelete(day)}>
                <Icon name="trash" />
              </button>
            </div>
          ))}
        </div>

      </main>

      <ActionBar>
        <button className="btn primary" onClick={() => setEditing('new')}>
          <Icon name="plus" /> Novo dia
        </button>
      </ActionBar>

      {editing && <DayForm day={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function DayForm({ day, onClose }: { day: Day | null; onClose: () => void }) {
  const exs = useExercises()
  const exMap = useExerciseMap()
  const catMap = useCategoryMap()
  const toast = useToast()
  const [name, setName] = useState(day?.name ?? '')
  const [selected, setSelected] = useState<number[]>(day?.exerciseIds ?? [])
  const [preview, setPreview] = useState<Exercise | null>(null)
  const [err, setErr] = useState('')

  const catNameOf = (ex?: Exercise) =>
    ex?.categoryId != null ? catMap.get(ex.categoryId)?.name : undefined

  const toggle = (id: number) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  const move = (i: number, dir: -1 | 1) =>
    setSelected((cur) => {
      const j = i + dir
      if (j < 0 || j >= cur.length) return cur
      const next = [...cur]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  const available = (exs ?? []).filter((e) => !selected.includes(e.id!))

  const submit = async () => {
    try {
      const input = { name, exerciseIds: selected }
      if (day) {
        await updateDay(day.id!, input, db)
        toast('Dia atualizado.')
      } else {
        await createDay(input, db)
        toast('Dia criado.')
      }
      onClose()
    } catch (e) {
      setErr(e instanceof ValidationError ? e.message : 'Erro ao salvar.')
    }
  }

  return (
    <>
    <Sheet title={day ? 'Editar dia' : 'Novo dia'} onClose={onClose}>
      <div className="field">
        <label htmlFor="day-name">Nome</label>
        <input id="day-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Ex.: Dia 1" />
      </div>

      <div className="field">
        <label>Exercícios do dia ({selected.length})</label>
        <div className="group">
          {selected.length === 0 && <div className="row" style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nenhum selecionado</div>}
          {selected.map((id, i) => {
            const ex = exMap.get(id)
            const cat = catNameOf(ex)
            return (
              <div key={id} className="row">
                <span className="row-body">
                  <span className="row-title">{ex?.name ?? '—'}</span>
                  {cat && <span className="row-sub">{cat}</span>}
                </span>
                <button
                  className="icon-btn ghost"
                  aria-label={`Detalhes de ${ex?.name ?? 'exercício'}`}
                  disabled={!ex}
                  onClick={() => ex && setPreview(ex)}
                >
                  <Icon name="info-circle" />
                </button>
                <button className="icon-btn ghost" aria-label="Subir" disabled={i === 0} onClick={() => move(i, -1)}>
                  <Icon name="chevron-up" />
                </button>
                <button className="icon-btn ghost" aria-label="Descer" disabled={i === selected.length - 1} onClick={() => move(i, 1)}>
                  <Icon name="chevron-down" />
                </button>
                <button className="icon-btn ghost" aria-label="Remover" onClick={() => toggle(id)}>
                  <Icon name="x" />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {available.length > 0 && (
        <div className="field">
          <label>Adicionar exercício</label>
          <div className="group">
            {available.map((e) => {
              const cat = catNameOf(e)
              return (
                <div key={e.id} className="row">
                  <button
                    aria-label={`Adicionar ${e.name}`}
                    onClick={() => toggle(e.id!)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      background: 'none',
                      border: 0,
                      textAlign: 'left',
                      color: 'inherit',
                      padding: 0,
                    }}
                  >
                    <span className="row-ic">
                      <Icon name="plus" />
                    </span>
                    <span className="row-body">
                      <span className="row-title">{e.name}</span>
                      {cat && <span className="row-sub">{cat}</span>}
                    </span>
                  </button>
                  <button
                    className="icon-btn ghost"
                    aria-label={`Detalhes de ${e.name}`}
                    onClick={() => setPreview(e)}
                  >
                    <Icon name="info-circle" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {err && <span className="err" style={{ display: 'block', marginBottom: 10 }}>{err}</span>}
      <div className="sheet-actions">
        <button className="btn subtle" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn primary" onClick={submit}>
          Salvar
        </button>
      </div>
    </Sheet>

      {preview && (
        <Sheet title={preview.name} onClose={() => setPreview(null)}>
          <div className="hero" style={{ marginBottom: 14 }}>
            <Media url={preview.mediaUrl} alt={preview.name} className="hero-media" />
          </div>
          <div className="ex-chips">
            {catNameOf(preview) ? (
              <span className="chip">
                <Icon name="tag" size={12} /> {catNameOf(preview)}
              </span>
            ) : (
              <span className="chip">Sem categoria</span>
            )}
          </div>
        </Sheet>
      )}
    </>
  )
}
