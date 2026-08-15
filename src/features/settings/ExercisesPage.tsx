import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import {
  createExercise,
  daysContaining,
  deleteExercise,
  updateExercise,
  ValidationError,
} from '../../db/repos'
import { db } from '../../db/db'
import type { Exercise, ExerciseKind } from '../../db/types'
import {
  useCategories,
  useCategoryMap,
  useDays,
  useExerciseMap,
  useExercises,
} from '../../lib/hooks'
import { alternativesOf } from '../../lib/alternatives'
import { dayNamesForExercise, exerciseCategoryLabel } from '../../lib/days'
import { filterExercises, type CategoryFilter, type DayFilter } from '../../lib/exerciseFilters'
import { ActionBar } from '../../ui/ActionBar'
import { BackBar } from '../../ui/Chrome'
import { useConfirm, useToast } from '../../ui/Feedback'
import { Icon } from '../../ui/Icon'
import { Media } from '../../ui/Media'

/** "Dia 2", "Dia 2 e Dia 4", "Dia 1, Dia 2 e Dia 4" — the confirmation reads as
 *  a sentence, so the last separator is "e", not a comma. */
function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`
}

export function ExercisesPage() {
  const exs = useExercises()
  const cats = useCategories()
  const catMap = useCategoryMap()
  const exMap = useExerciseMap()
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
  // `?? []` only feeds the filter — every branch that *claims* emptiness below
  // waits for `exs` itself, so a catalog that has not loaded yet is never
  // reported as "Nenhum exercício".
  const filtered = filterExercises(
    exs ?? [],
    { search, category: categoryFilter, dayId: dayFilter },
    days ?? [],
  )

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
        {exs && exs.length === 0 && (
          <div className="empty">
            <span className="big">🏋️</span>
            <h2>Nenhum exercício</h2>
            <p>Cadastre exercícios com nome, imagem/GIF e categoria.</p>
          </div>
        )}

        {exs && exs.length > 0 && (
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

        {exs && exs.length > 0 && filtered.length === 0 && (
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
            const alts = alternativesOf(e, exMap)
            return (
            <div key={e.id} className="row">
              <Media className="thumb" url={e.mediaUrl} alt={e.name} />
              <span className="row-body">
                <span className="row-title">
                  {e.name}
                  {/* Only cardio is marked: strength is the default and the
                      overwhelming majority — a chip on every row would be noise. */}
                  {e.kind === 'cardio' && (
                    <span className="chip sm accent kind-chip">
                      <Icon name="heartbeat" /> Cardio
                    </span>
                  )}
                </span>
                <span className="row-sub">{exerciseCategoryLabel(e, catMap)}</span>
                {e.kind === 'cardio' ? null : dayNames.length ? (
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
                {/* Only when there ARE alternatives: having none is the normal
                    case and does not deserve a line of its own. */}
                {alts.length > 0 && (
                  <span className="chip-row">
                    {alts.map((a) => (
                      <span key={a.id} className="chip sm">
                        <Icon name="arrows-left-right" /> {a.name}
                      </span>
                    ))}
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
  const exs = useExercises()
  const toast = useToast()
  const confirm = useConfirm()
  const nav = useNavigate()
  const [name, setName] = useState(exercise?.name ?? '')
  const [kind, setKind] = useState<ExerciseKind>(exercise?.kind ?? 'strength')
  const [mediaUrl, setMediaUrl] = useState(exercise?.mediaUrl ?? '')
  const [categoryIds, setCategoryIds] = useState<number[]>(exercise?.categoryIds ?? [])
  const [alternativeIds, setAlternativeIds] = useState<number[]>(exercise?.alternativeIds ?? [])
  const [altSearch, setAltSearch] = useState('')
  const [err, setErr] = useState('')

  const back = () => nav('/settings/exercises')
  const toggleCat = (id: number) =>
    setCategoryIds((cur) => (cur.includes(id) ? cur.filter((c) => c !== id) : [...cur, id]))
  const toggleAlt = (id: number) =>
    setAlternativeIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  // Every other exercise is a candidate; the selected ones stay visible whatever
  // the search says, so unchecking never requires finding them again.
  const others = (exs ?? []).filter((e) => e.id !== exercise?.id)
  const chosen = others.filter((e) => alternativeIds.includes(e.id!))
  const offered = filterExercises(
    others.filter((e) => !alternativeIds.includes(e.id!)),
    { search: altSearch },
    [],
  )

  const submit = async () => {
    try {
      const input = {
        name,
        kind,
        mediaUrl: mediaUrl || undefined,
        categoryIds,
        alternativeIds,
      }
      if (exercise) {
        // Becoming cardio takes the exercise out of every day, so the user is
        // told WHICH days before it happens — not after, with a toast.
        if (kind === 'cardio' && exercise.kind !== 'cardio') {
          const days = await daysContaining(exercise.id!, db)
          if (days.length) {
            const ok = await confirm({
              title: 'Tornar este exercício um cardio?',
              message: `Cardio não entra em dia de treino, então ele sairá de ${listNames(
                days.map((day) => day.name),
              )}. O peso registrado é mantido.`,
              confirmLabel: 'Tornar cardio',
            })
            if (!ok) return
          }
        }
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
          <label>Tipo</label>
          {/* Segmented like the weight unit picker: two closed options, always
              both visible, no hidden state. */}
          <div className="unit-seg kind-seg" role="group" aria-label="Tipo">
            <button
              type="button"
              className={kind === 'strength' ? 'on' : ''}
              aria-pressed={kind === 'strength'}
              onClick={() => setKind('strength')}
            >
              Força
            </button>
            <button
              type="button"
              className={kind === 'cardio' ? 'on' : ''}
              aria-pressed={kind === 'cardio'}
              onClick={() => setKind('cardio')}
            >
              Cardio
            </button>
          </div>
          <small className="hint">
            {kind === 'cardio'
              ? 'Sem peso — só observação e fotos. Fica na aba Cardio, fora dos dias de treino.'
              : 'Tem peso alvo e entra nos dias de treino.'}
          </small>
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

        <div className="field">
          <label htmlFor="ex-alt-search">Alternativas</label>
          <p className="note-empty">
            Exercícios que substituem este. Eles não entram nos dias de treino junto com ele —
            aparecem no detalhe, e durante o treino você pode marcar que fez um deles no lugar.
          </p>
          {others.length === 0 ? (
            <p className="note-empty">Nenhum outro exercício cadastrado ainda.</p>
          ) : (
            <>
              <input
                id="ex-alt-search"
                value={altSearch}
                onChange={(e) => setAltSearch(e.target.value)}
                placeholder="Buscar por nome"
              />
              <div className="chip-select" role="group" aria-label="Alternativas">
                {/* Selected first and always shown — a search that hid them
                    would make unchecking a scavenger hunt. */}
                {chosen.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    className="chip-toggle on"
                    aria-pressed={true}
                    onClick={() => toggleAlt(e.id!)}
                  >
                    <Icon name="check" size={12} /> {e.name}
                  </button>
                ))}
                {offered.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    className="chip-toggle"
                    aria-pressed={false}
                    onClick={() => toggleAlt(e.id!)}
                  >
                    {e.name}
                  </button>
                ))}
              </div>
              {offered.length === 0 && altSearch.trim() !== '' && (
                <p className="note-empty">Nenhum exercício encontrado.</p>
              )}
            </>
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
