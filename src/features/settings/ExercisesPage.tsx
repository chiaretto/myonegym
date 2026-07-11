import { useState } from 'react'
import { createExercise, deleteExercise, updateExercise, ValidationError } from '../../db/repos'
import { db } from '../../db/db'
import type { Exercise } from '../../db/types'
import { useCategories, useCategoryMap, useDays, useExercises } from '../../lib/hooks'
import { dayNamesForExercise } from '../../lib/days'
import { filterExercises, type CategoryFilter, type DayFilter } from '../../lib/exerciseFilters'
import { BackBar } from '../../ui/Chrome'
import { useConfirm, useToast } from '../../ui/Feedback'
import { Icon } from '../../ui/Icon'
import { Media } from '../../ui/Media'
import { Sheet } from '../../ui/Sheet'

export function ExercisesPage() {
  const exs = useExercises()
  const cats = useCategories()
  const catMap = useCategoryMap()
  const days = useDays()
  const toast = useToast()
  const confirm = useConfirm()
  const [editing, setEditing] = useState<Exercise | 'new' | null>(null)
  const [search, setSearch] = useState('')
  const [categorySel, setCategorySel] = useState('all')
  const [daySel, setDaySel] = useState('all')

  const categoryFilter: CategoryFilter =
    categorySel === 'all' || categorySel === 'none' ? categorySel : Number(categorySel)
  const dayFilter: DayFilter = daySel === 'all' || daySel === 'none' ? daySel : Number(daySel)
  const filtersActive = search.trim() !== '' || categorySel !== 'all' || daySel !== 'all'
  const filtered = filterExercises(exs, { search, categoryId: categoryFilter, dayId: dayFilter }, days)

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
      <main className="screen">
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
                <span className="row-sub">
                  {e.categoryId != null ? catMap.get(e.categoryId)?.name ?? 'Sem categoria' : 'Sem categoria'}
                </span>
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
              <button className="icon-btn ghost" aria-label="Editar" onClick={() => setEditing(e)}>
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

        <button className="btn primary" style={{ marginTop: 14 }} onClick={() => setEditing('new')}>
          <Icon name="plus" /> Novo exercício
        </button>
      </main>

      {editing && <ExerciseForm exercise={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function ExerciseForm({ exercise, onClose }: { exercise: Exercise | null; onClose: () => void }) {
  const cats = useCategories()
  const toast = useToast()
  const [name, setName] = useState(exercise?.name ?? '')
  const [mediaUrl, setMediaUrl] = useState(exercise?.mediaUrl ?? '')
  const [categoryId, setCategoryId] = useState<number | ''>(exercise?.categoryId ?? '')
  const [err, setErr] = useState('')

  const submit = async () => {
    try {
      const input = {
        name,
        mediaUrl: mediaUrl || undefined,
        categoryId: categoryId === '' ? undefined : Number(categoryId),
      }
      if (exercise) {
        await updateExercise(exercise.id!, input, db)
        toast('Exercício atualizado.')
      } else {
        await createExercise(input, db)
        toast('Exercício criado.')
      }
      onClose()
    } catch (e) {
      setErr(e instanceof ValidationError ? e.message : 'Erro ao salvar.')
    }
  }

  return (
    <Sheet title={exercise ? 'Editar exercício' : 'Novo exercício'} onClose={onClose}>
      <div className="field">
        <label htmlFor="ex-name">Nome</label>
        <input id="ex-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Ex.: Rosca Direta" />
      </div>
      <div className="field">
        <label htmlFor="ex-media">URL da imagem ou GIF (opcional)</label>
        <input id="ex-media" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://…/rosca.gif" />
      </div>
      <div className="field">
        <label htmlFor="ex-cat">Categoria</label>
        <select id="ex-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))}>
          <option value="">Sem categoria</option>
          {cats?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {mediaUrl && (
        <div style={{ marginBottom: 14 }}>
          <Media className="thumb" url={mediaUrl} alt="pré-visualização" />
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
