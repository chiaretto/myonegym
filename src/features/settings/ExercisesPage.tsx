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
import type { Exercise, ExerciseKind, ExerciseVideo } from '../../db/types'
import {
  useCategories,
  useCategoryMap,
  useDays,
  useExerciseMap,
  useExercises,
  useWarmups,
} from '../../lib/hooks'
import { alternativesOf } from '../../lib/alternatives'
import { dayNamesForExercise, exerciseCategoryLabel } from '../../lib/days'
import {
  filterExercises,
  normalizeForSearch,
  type CategoryFilter,
  type DayFilter,
} from '../../lib/exerciseFilters'
import { ActionBar } from '../../ui/ActionBar'
import { BackBar } from '../../ui/Chrome'
import { embedLinkLabel, supportsTimeRange } from '../../lib/embedMedia'
import { formatRange, parseClock } from '../../lib/videoTime'
// The videos section renders the same rows the Vídeos tab does.
import '../exercise/exercise.css'
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
  const warmups = useWarmups()
  const toast = useToast()
  const confirm = useConfirm()
  const nav = useNavigate()
  const [name, setName] = useState(exercise?.name ?? '')
  const [kind, setKind] = useState<ExerciseKind>(exercise?.kind ?? 'strength')
  const [mediaUrl, setMediaUrl] = useState(exercise?.mediaUrl ?? '')
  const [categoryIds, setCategoryIds] = useState<number[]>(exercise?.categoryIds ?? [])
  const [alternativeIds, setAlternativeIds] = useState<number[]>(exercise?.alternativeIds ?? [])
  const [warmupIds, setWarmupIds] = useState<number[]>(exercise?.warmupIds ?? [])
  const [videos, setVideos] = useState<ExerciseVideo[]>(exercise?.videos ?? [])
  const [wuSearch, setWuSearch] = useState('')
  const [altSearch, setAltSearch] = useState('')
  const [err, setErr] = useState('')

  const back = () => nav('/settings/exercises')
  const toggleCat = (id: number) =>
    setCategoryIds((cur) => (cur.includes(id) ? cur.filter((c) => c !== id) : [...cur, id]))
  const toggleAlt = (id: number) =>
    setAlternativeIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  // Appending, not sorting: the order chosen here is the order the warm-up
  // viewer pages through.
  const toggleWarmup = (id: number) =>
    setWarmupIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  // Every other exercise is a candidate; the selected ones stay visible whatever
  // the search says, so unchecking never requires finding them again.
  const others = (exs ?? []).filter((e) => e.id !== exercise?.id)
  const chosen = others.filter((e) => alternativeIds.includes(e.id!))
  // In the exercise's own order, so the picker shows what the viewer will page.
  const chosenWarmups = warmupIds
    .map((id) => (warmups ?? []).find((w) => w.id === id))
    .filter((w): w is NonNullable<typeof w> => w != null)
  const offeredWarmups = (warmups ?? []).filter(
    (w) =>
      !warmupIds.includes(w.id!) &&
      normalizeForSearch(w.name).includes(normalizeForSearch(wuSearch)),
  )
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
        warmupIds,
        videos,
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
        <div className="field">
          <label htmlFor="ex-wu-search">Aquecimentos</label>
          <p className="note-empty">
            Preparo para este exercício — imagens, vídeos ou links. O mesmo aquecimento pode servir
            vários exercícios, e a ordem escolhida aqui é a ordem em que eles aparecem.
          </p>
          {(warmups ?? []).length === 0 ? (
            <p className="note-empty">
              Nenhum aquecimento cadastrado ainda. Crie em Configurações → Aquecimentos.
            </p>
          ) : (
            <>
              <input
                id="ex-wu-search"
                value={wuSearch}
                onChange={(e) => setWuSearch(e.target.value)}
                placeholder="Buscar por nome"
              />
              <div className="chip-select" role="group" aria-label="Aquecimentos">
                {/* Chosen first and always visible, like the alternatives picker:
                    a search that hid them would make unchecking a hunt. */}
                {chosenWarmups.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    className="chip-toggle on"
                    aria-pressed={true}
                    onClick={() => toggleWarmup(w.id!)}
                  >
                    <Icon name="check" size={12} /> {w.name}
                  </button>
                ))}
                {offeredWarmups.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    className="chip-toggle"
                    aria-pressed={false}
                    onClick={() => toggleWarmup(w.id!)}
                  >
                    {w.name}
                  </button>
                ))}
              </div>
              {offeredWarmups.length === 0 && wuSearch.trim() !== '' && (
                <p className="note-empty">Nenhum aquecimento encontrado.</p>
              )}
            </>
          )}
        </div>
        <VideosField videos={videos} onChange={setVideos} />
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

/**
 * The exercise's videos, edited inside its own form.
 *
 * There is no Settings screen for these on purpose: a video belongs to one
 * exercise and has nothing to administer outside it (see the `exercise-videos`
 * capability). The order of the list is the order the viewer pages through, so
 * moving a row is a real edit and not a display preference.
 */
function VideosField({
  videos,
  onChange,
}: {
  videos: ExerciseVideo[]
  onChange: (next: ExerciseVideo[]) => void
}) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [err, setErr] = useState('')

  // One function decides where a range is honoured — the same one the player
  // asks — so this can never offer a field the viewer would ignore.
  const ranged = supportsTimeRange(url)

  const add = () => {
    const clean = url.trim()
    if (!clean) return setErr('Informe a URL do vídeo.')
    if (!/^https?:\/\/.+/i.test(clean)) return setErr('URL inválida (use http:// ou https://).')

    let startSec: number | undefined
    let endSec: number | undefined
    if (ranged) {
      if (start.trim()) {
        const n = parseClock(start)
        if (n == null) return setErr('Início inválido — use 2:10 ou 130.')
        startSec = n
      }
      if (end.trim()) {
        const n = parseClock(end)
        if (n == null) return setErr('Fim inválido — use 2:45 ou 165.')
        endSec = n
      }
      if (startSec !== undefined && endSec !== undefined && endSec <= startSec) {
        return setErr('O fim deve ser maior que o início.')
      }
    }

    onChange([
      ...videos,
      {
        url: clean,
        ...(startSec !== undefined ? { startSec } : {}),
        ...(endSec !== undefined ? { endSec } : {}),
        ...(title.trim() ? { title: title.trim() } : {}),
      },
    ])
    setUrl('')
    setTitle('')
    setStart('')
    setEnd('')
    setErr('')
  }

  const removeAt = (i: number) => onChange(videos.filter((_, n) => n !== i))
  const move = (i: number, by: number) => {
    const to = i + by
    if (to < 0 || to >= videos.length) return
    const next = [...videos]
    ;[next[i], next[to]] = [next[to], next[i]]
    onChange(next)
  }

  return (
    <div className="field">
      <label htmlFor="ex-video-url">Vídeos</label>
      <p className="note-empty">
        Vídeos de execução deste exercício, do YouTube ou do Instagram. A ordem escolhida aqui é a
        ordem em que eles aparecem.
      </p>

      {videos.length > 0 && (
        <ul className="video-list" aria-label="Vídeos do exercício">
          {videos.map((v, i) => {
            const range = formatRange(v)
            return (
              <li key={`${v.url}-${i}`} className="video-row">
                <div className="video-row-main">
                  <span className="video-row-title">{v.title || embedLinkLabel(v.url)}</span>
                  <span className="row-sub">
                    {embedLinkLabel(v.url)}
                    {range ? ` · ${range}` : ''}
                  </span>
                </div>
                <div className="video-row-actions">
                  <button
                    type="button"
                    className="icon-btn ghost"
                    aria-label={`Mover ${v.title || embedLinkLabel(v.url)} para cima`}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <Icon name="chevron-up" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn ghost"
                    aria-label={`Mover ${v.title || embedLinkLabel(v.url)} para baixo`}
                    disabled={i === videos.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <Icon name="chevron-down" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn ghost danger"
                    aria-label={`Remover ${v.title || embedLinkLabel(v.url)}`}
                    onClick={() => removeAt(i)}
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <input
        id="ex-video-url"
        value={url}
        onChange={(e) => {
          setUrl(e.target.value)
          setErr('')
        }}
        placeholder="https://youtube.com/watch?v=… ou instagram.com/reel/…"
        aria-label="URL do vídeo"
      />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Rótulo (opcional) — ex.: pegada fechada"
        aria-label="Rótulo do vídeo"
      />

      {/* The range fields exist only where the player takes them. Asking for a
          number the provider will ignore is a promise the screen cannot keep. */}
      {ranged ? (
        <div className="video-range">
          <input
            value={start}
            onChange={(e) => setStart(e.target.value)}
            placeholder="Início (2:10)"
            aria-label="Início do trecho"
          />
          <input
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            placeholder="Fim (2:45)"
            aria-label="Fim do trecho"
          />
        </div>
      ) : (
        url.trim() && (
          <p className="note-empty">
            O Instagram não permite escolher o trecho — o vídeo abre do começo.
          </p>
        )
      )}

      {err && <span className="err">{err}</span>}
      <button type="button" className="btn subtle" onClick={add}>
        <Icon name="plus" /> Adicionar vídeo
      </button>
    </div>
  )
}
