import { useState } from 'react'
import { createDay, deleteDay, updateDay, ValidationError } from '../../db/repos'
import { db } from '../../db/db'
import type { Day } from '../../db/types'
import { useCategories, useCategoryMap, useExerciseMap, useExercises, useDays } from '../../lib/hooks'
import { BackBar } from '../../ui/Chrome'
import { useConfirm, useToast } from '../../ui/Feedback'
import { Icon } from '../../ui/Icon'
import { Sheet } from '../../ui/Sheet'

export function DaysPage() {
  const days = useDays()
  const catMap = useCategoryMap()
  const toast = useToast()
  const confirm = useConfirm()
  const [editing, setEditing] = useState<Day | 'new' | null>(null)

  const onDelete = async (day: Day) => {
    const ok = await confirm({ title: `Excluir "${day.name}"?`, confirmLabel: 'Excluir', danger: true })
    if (!ok) return
    await deleteDay(day.id!, db)
    toast('Dia excluído.')
  }

  return (
    <>
      <BackBar title="Dias de treino" to="/settings" />
      <main className="screen">
        {days && days.length === 0 && (
          <div className="empty">
            <span className="big">🗓️</span>
            <h2>Nenhum dia de treino</h2>
            <p>Crie dias (ex.: "Dia 1") e escolha quais exercícios entram em cada um.</p>
          </div>
        )}

        <div className="group">
          {days?.map((day) => (
            <div key={day.id} className="row">
              <span className="row-ic">
                <Icon name="calendar-event" />
              </span>
              <span className="row-body">
                <span className="row-title">{day.name}</span>
                <span className="row-sub">
                  {(day.categoryId != null ? catMap.get(day.categoryId)?.name + ' · ' : '') +
                    `${day.exerciseIds.length} exercícios`}
                </span>
              </span>
              <button className="icon-btn ghost" aria-label="Editar" onClick={() => setEditing(day)}>
                <Icon name="pencil" />
              </button>
              <button className="icon-btn ghost" aria-label="Excluir" onClick={() => onDelete(day)}>
                <Icon name="trash" />
              </button>
            </div>
          ))}
        </div>

        <button className="btn primary" style={{ marginTop: 14 }} onClick={() => setEditing('new')}>
          <Icon name="plus" /> Novo dia
        </button>
      </main>

      {editing && <DayForm day={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function DayForm({ day, onClose }: { day: Day | null; onClose: () => void }) {
  const cats = useCategories()
  const exs = useExercises()
  const exMap = useExerciseMap()
  const toast = useToast()
  const [name, setName] = useState(day?.name ?? '')
  const [categoryId, setCategoryId] = useState<number | ''>(day?.categoryId ?? '')
  const [selected, setSelected] = useState<number[]>(day?.exerciseIds ?? [])
  const [err, setErr] = useState('')

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
      const input = { name, categoryId: categoryId === '' ? undefined : Number(categoryId), exerciseIds: selected }
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
    <Sheet title={day ? 'Editar dia' : 'Novo dia'} onClose={onClose}>
      <div className="field">
        <label htmlFor="day-name">Nome</label>
        <input id="day-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Ex.: Dia 1" />
      </div>
      <div className="field">
        <label htmlFor="day-cat">Categoria (opcional)</label>
        <select id="day-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))}>
          <option value="">Sem categoria</option>
          {cats?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Exercícios do dia ({selected.length})</label>
        <div className="group">
          {selected.length === 0 && <div className="row" style={{ color: 'var(--text-muted)', fontSize: 13 }}>Nenhum selecionado</div>}
          {selected.map((id, i) => (
            <div key={id} className="row">
              <span className="row-body">
                <span className="row-title">{exMap.get(id)?.name ?? '—'}</span>
              </span>
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
          ))}
        </div>
      </div>

      {available.length > 0 && (
        <div className="field">
          <label>Adicionar exercício</label>
          <div className="group">
            {available.map((e) => (
              <button key={e.id} className="row" onClick={() => toggle(e.id!)}>
                <span className="row-ic">
                  <Icon name="plus" />
                </span>
                <span className="row-body">
                  <span className="row-title">{e.name}</span>
                </span>
              </button>
            ))}
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
  )
}
