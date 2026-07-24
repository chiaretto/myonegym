import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import { createDay, deleteDay, reorderDays, updateDay, ValidationError } from '../../db/repos'
import { db } from '../../db/db'
import type { Day, Exercise } from '../../db/types'
import { useCategories, useCategoryMap, useExerciseMap, useExercises, useDays } from '../../lib/hooks'
import { daySubtitle, exerciseCategoryNames } from '../../lib/days'
import { filterExercises, type CategoryFilter } from '../../lib/exerciseFilters'
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
  const nav = useNavigate()

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
              <button
                style={dayEditStyle}
                aria-label={`Editar ${day.name}`}
                onClick={() => nav(`/settings/days/${day.id}/edit`)}
              >
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
        <button className="btn primary" onClick={() => nav('/settings/days/new')}>
          <Icon name="plus" /> Novo dia
        </button>
      </ActionBar>
    </>
  )
}

export function DayFormPage() {
  const { id } = useParams()
  const editId = id != null ? Number(id) : null
  const day = useLiveQuery(
    async () => (editId == null ? null : ((await db.days.get(editId)) ?? null)),
    [editId],
    editId == null ? null : undefined,
  )

  if (editId != null && day === undefined) {
    return <BackBar title="Editar dia" to="/settings/days" />
  }
  if (editId != null && day === null) {
    return (
      <>
        <BackBar title="Editar dia" to="/settings/days" />
        <div className="empty">
          <p>Dia não encontrado.</p>
        </div>
      </>
    )
  }

  return <DayForm day={day ?? null} />
}

function DayForm({ day }: { day: Day | null }) {
  const exs = useExercises()
  const exMap = useExerciseMap()
  const cats = useCategories()
  const catMap = useCategoryMap()
  const toast = useToast()
  const nav = useNavigate()
  const [name, setName] = useState(day?.name ?? '')
  const [selected, setSelected] = useState<number[]>(day?.exerciseIds ?? [])
  const [preview, setPreview] = useState<Exercise | null>(null)
  const [err, setErr] = useState('')
  const [search, setSearch] = useState('')
  const [categorySel, setCategorySel] = useState('all')

  const back = () => nav('/settings/days')

  const catNameOf = (ex?: Exercise) => {
    const names = exerciseCategoryNames(ex, catMap)
    return names.length ? names.join(' · ') : undefined
  }

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

  // Candidates to add = catalog minus what's already in the day, then narrowed by
  // the picker filters. Filtering after the exclusion means an added exercise
  // leaves the list no matter which filters are active.
  const available = (exs ?? []).filter((e) => !selected.includes(e.id!))
  const categoryFilter: CategoryFilter =
    categorySel === 'all' || categorySel === 'none' ? categorySel : Number(categorySel)
  // No day filter here: this form is already scoped to a single day, so `days` is unused.
  const candidates = filterExercises(available, { search, category: categoryFilter }, [])
  const filtersActive = search.trim() !== '' || categorySel !== 'all'
  const clearFilters = () => {
    setSearch('')
    setCategorySel('all')
  }

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
      back()
    } catch (e) {
      setErr(e instanceof ValidationError ? e.message : 'Erro ao salvar.')
    }
  }

  return (
    <>
      <BackBar title={day ? 'Editar dia' : 'Novo dia'} to="/settings/days" />
      <main className="screen has-action-bar">
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

            {/* View-only filters over the candidates — never over the day's own list. */}
            <div className="filters">
              <div className="field">
                <label htmlFor="day-ex-search">Buscar por nome</label>
                <input
                  id="day-ex-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome"
                />
              </div>
              <div className="field">
                <label htmlFor="day-ex-cat">Categoria</label>
                <select id="day-ex-cat" value={categorySel} onChange={(e) => setCategorySel(e.target.value)}>
                  <option value="all">Todas as categorias</option>
                  <option value="none">Sem categoria</option>
                  {cats?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {candidates.length === 0 ? (
              <div style={{ display: 'grid', gap: 10, justifyItems: 'start', padding: '4px 0 10px' }}>
                <p className="note-empty">Nenhum exercício encontrado</p>
                {filtersActive && (
                  <button className="btn subtle" onClick={clearFilters}>
                    Limpar filtros
                  </button>
                )}
              </div>
            ) : (
            <div className="group">
              {candidates.map((e) => {
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
            )}
          </div>
        )}

        {err && <span className="err" style={{ display: 'block', marginBottom: 10 }}>{err}</span>}
      </main>

      <ActionBar>
        <div className="form-actions">
          <button className="btn subtle" onClick={back}>
            Cancelar
          </button>
          <button className="btn primary" onClick={submit}>
            Salvar
          </button>
        </div>
      </ActionBar>

      {/* Read-only exercise peek — stays a modal (not a form). */}
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
