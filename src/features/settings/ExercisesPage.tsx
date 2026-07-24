import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import { createExercise, deleteExercise, updateExercise, ValidationError } from '../../db/repos'
import { db } from '../../db/db'
import type { Exercise } from '../../db/types'
import { useCategories, useCategoryMap, useDays, useExercises } from '../../lib/hooks'
import { dayNamesForExercise, exerciseCategoryLabel } from '../../lib/days'
import { filterExercises, type CategoryFilter, type DayFilter } from '../../lib/exerciseFilters'
import { ActionBar } from '../../ui/ActionBar'
import { BackBar } from '../../ui/Chrome'
import { useConfirm, useToast } from '../../ui/Feedback'
import { Icon } from '../../ui/Icon'
import { Media } from '../../ui/Media'

export function ExercisesPage() {
  const exs = useExercises()
  const cats = useCategories()
  const catMap = useCategoryMap()
  const days = useDays()
  const toast = useToast()
  const confirm = useConfirm()
  const nav = useNavigate()
  const [search, setSearch] = useState('')
  const [categorySel, setCategorySel] = useState('all')
  const [daySel, setDaySel] = useState('all')

  const categoryFilter: CategoryFilter =
    categorySel === 'all' || categorySel === 'none' ? categorySel : Number(categorySel)
  const dayFilter: DayFilter = daySel === 'all' || daySel === 'none' ? daySel : Number(daySel)
  const filtersActive = search.trim() !== '' || categorySel !== 'all' || daySel !== 'all'
  const filtered = filterExercises(exs, { search, category: categoryFilter, dayId: dayFilter }, days)

  const clearFilters = () => {
    setSearch('')
    setCategorySel('all')
    setDaySel('all')
  }

  const onDelete = async (e: Exercise) => {
    const ok = await confirm({
      title: `Excluir "${e.name}"?`,
      message: 'Ele será removido dos dias de treino e seus pesos/histórico serão apagados.',
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (!ok) return
    await deleteExercise(e.id!, db)
    toast('Exercício excluído.')
  }

  return (
    <>
      <BackBar title="Exercícios" to="/settings" />
      <main className="screen has-action-bar">
        {exs.length === 0 && (
          <div className="empty">
            <span className="big">🏋️</span>
            <h2>Nenhum exercício</h2>
            <p>Cadastre exercícios com nome, imagem/GIF e categoria.</p>
          </div>
        )}

        {exs.length > 0 && (
          <div className="filters">
            <div className="field">
              <label htmlFor="ex-filter-search">Buscar por nome</label>
              <input
                id="ex-filter-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome"
              />
            </div>
            <div className="filters-row">
              <div className="field">
                <label htmlFor="ex-filter-cat">Categoria</label>
                <select id="ex-filter-cat" value={categorySel} onChange={(e) => setCategorySel(e.target.value)}>
                  <option value="all">Todas as categorias</option>
                  <option value="none">Sem categoria</option>
                  {cats?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="ex-filter-day">Dia de treino</label>
                <select id="ex-filter-day" value={daySel} onChange={(e) => setDaySel(e.target.value)}>
                  <option value="all">Todos os dias</option>
                  <option value="none">Nenhum dia</option>
                  {days?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {exs.length > 0 && filtered.length === 0 && (
          <div className="empty">
            <span className="big">🔎</span>
            <h2>Nenhum exercício encontrado</h2>
            <p>Ajuste a busca ou os filtros para ver outros exercícios.</p>
            {filtersActive && (
              <button className="btn subtle" onClick={clearFilters}>
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {filtered.length > 0 && (
        <div className="group">
          {filtered.map((e) => {
            const dayNames = dayNamesForExercise(e.id!, days ?? [])
            return (
            <div key={e.id} className="row">
              <Media className="thumb" url={e.mediaUrl} alt={e.name} />
              <span className="row-body">
                <span className="row-title">{e.name}</span>
                <span className="row-sub">{exerciseCategoryLabel(e, catMap)}</span>
                {dayNames.length ? (
                  <span className="chip-row">
                    {dayNames.map((n, i) => (
                      <span key={`${n}-${i}`} className="chip sm">
                        <Icon name="calendar-event" /> {n}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="row-sub" style={{ color: 'var(--text-muted)' }}>
                    <Icon name="calendar-event" /> Nenhum dia
                  </span>
                )}
              </span>
              <button
                className="icon-btn ghost"
                aria-label="Editar"
                onClick={() => nav(`/settings/exercises/${e.id}/edit`)}
              >
                <Icon name="pencil" />
              </button>
              <button className="icon-btn ghost" aria-label="Excluir" onClick={() => onDelete(e)}>
                <Icon name="trash" />
              </button>
            </div>
            )
          })}
        </div>
        )}
      </main>

      <ActionBar>
        <button className="btn primary" onClick={() => nav('/settings/exercises/new')}>
          <Icon name="plus" /> Novo exercício
        </button>
      </ActionBar>
    </>
  )
}

export function ExerciseFormPage() {
  const { id } = useParams()
  const editId = id != null ? Number(id) : null
  const exercise = useLiveQuery(
    async () => (editId == null ? null : ((await db.exercises.get(editId)) ?? null)),
    [editId],
    editId == null ? null : undefined,
  )

  if (editId != null && exercise === undefined) {
    return <BackBar title="Editar exercício" to="/settings/exercises" />
  }
  if (editId != null && exercise === null) {
    return (
      <>
        <BackBar title="Editar exercício" to="/settings/exercises" />
        <div className="empty">
          <p>Exercício não encontrado.</p>
        </div>
      </>
    )
  }

  return <ExerciseForm exercise={exercise ?? null} />
}

function ExerciseForm({ exercise }: { exercise: Exercise | null }) {
  const cats = useCategories()
  const toast = useToast()
  const nav = useNavigate()
  const [name, setName] = useState(exercise?.name ?? '')
  const [mediaUrl, setMediaUrl] = useState(exercise?.mediaUrl ?? '')
  const [categoryIds, setCategoryIds] = useState<number[]>(exercise?.categoryIds ?? [])
  const [err, setErr] = useState('')

  const back = () => nav('/settings/exercises')
  const toggleCat = (id: number) =>
    setCategoryIds((cur) => (cur.includes(id) ? cur.filter((c) => c !== id) : [...cur, id]))

  const submit = async () => {
    try {
      const input = {
        name,
        mediaUrl: mediaUrl || undefined,
        categoryIds,
      }
      if (exercise) {
        await updateExercise(exercise.id!, input, db)
        toast('Exercício atualizado.')
      } else {
        await createExercise(input, db)
        toast('Exercício criado.')
      }
      back()
    } catch (e) {
      setErr(e instanceof ValidationError ? e.message : 'Erro ao salvar.')
    }
  }

  return (
    <>
      <BackBar title={exercise ? 'Editar exercício' : 'Novo exercício'} to="/settings/exercises" />
      <main className="screen has-action-bar">
        <div className="field">
          <label htmlFor="ex-name">Nome</label>
          <input id="ex-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Ex.: Rosca Direta" />
        </div>
        <div className="field">
          <label htmlFor="ex-media">URL da imagem ou GIF (opcional)</label>
          <input id="ex-media" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://…/rosca.gif" />
        </div>
        {/* Same hero treatment as the exercise detail screen, right under the
            field that feeds it: what you see here is what that screen shows.
            Always rendered (placeholder when empty) so typing a URL doesn't
            shift the fields below. */}
        <div className="hero">
          <Media className="hero-media" url={mediaUrl || undefined} alt="Pré-visualização da mídia" />
        </div>
        <div className="field">
          <label>Categorias</label>
          {cats && cats.length > 0 ? (
            <div className="chip-select" role="group" aria-label="Categorias">
              {cats.map((c) => {
                const on = categoryIds.includes(c.id!)
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`chip-toggle${on ? ' on' : ''}`}
                    aria-pressed={on}
                    onClick={() => toggleCat(c.id!)}
                  >
                    {on && <Icon name="check" size={12} />} {c.name}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="note-empty">Nenhuma categoria ainda. Crie categorias em Configurações → Categorias.</p>
          )}
        </div>
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
    </>
  )
}
