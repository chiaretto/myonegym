import { useEffect, useMemo, useState } from 'react'
import { useConfirm, useToast } from '../../ui/Feedback'
import { Icon } from '../../ui/Icon'
import {
  AdminRequestError,
  deleteCategory,
  deleteExercise,
  fetchCatalog,
  saveCategory,
  saveExercise,
  type AdminCatalog,
  type AdminExercise,
  type AdminVideo,
} from './adminClient'
import './admin.css'

/**
 * The **official catalog** editor — a maintenance tool, not a feature.
 *
 * The alternative is editing `src/data/officialCatalog.json` by hand, and what
 * you get wrong there you get wrong silently: a `categoryIds` with a number
 * nothing answers to does not break anything, the exercise merely turns up
 * without that category; an alternative declared from one side only shows on one
 * screen; and the picture is a second, separate step (`npm run exercise-media`)
 * that is exactly the kind of step people forget.
 *
 * It exists **only in development** — see `App.tsx`, where the route is behind
 * `import.meta.env.DEV`. Published it could only be a screen that fails at
 * everything it tries, since the server it talks to is the dev server; and a
 * "hidden" URL in the open invites whoever finds it.
 *
 * It does not show the user's own exercises. The file does not contain them, and
 * they already have their own screens in the app.
 */

/** The form's own copy of an exercise, while it is being edited. */
interface Draft {
  name: string
  kind: 'strength' | 'cardio'
  categoryIds: number[]
  alternativeIds: number[]
  videos: AdminVideo[]
  /** Where to fetch a new picture from. Never stored — see `adminClient`. */
  mediaUrl: string
}

type Status = { tone: 'ok' | 'bad'; text: string } | null

function toDraft(e: AdminExercise | null): Draft {
  return {
    name: e?.name ?? '',
    kind: e?.kind === 'cardio' ? 'cardio' : 'strength',
    categoryIds: e?.categoryIds ?? [],
    alternativeIds: e?.alternativeIds ?? [],
    videos: e?.videos ?? [],
    mediaUrl: '',
  }
}

function toggle(ids: number[], id: number): number[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
}

export default function AdminPage() {
  const [catalog, setCatalog] = useState<AdminCatalog | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    void fetchCatalog()
      .then(setCatalog)
      .catch((e: unknown) =>
        setLoadError(e instanceof AdminRequestError ? e.message : 'Erro ao ler o catálogo.'),
      )
  }, [])

  if (loadError) {
    return (
      <main className="admin">
        <h1>Catálogo oficial</h1>
        <div className="empty">
          <p>{loadError}</p>
          <p className="admin-note">
            Esta tela só funciona com <code>npm run dev</code>, aberta no próprio computador: a API
            que grava o arquivo recusa qualquer outro endereço.
          </p>
        </div>
      </main>
    )
  }

  if (!catalog) {
    return (
      <main className="admin">
        <h1>Catálogo oficial</h1>
        <p className="admin-note">Lendo o arquivo…</p>
      </main>
    )
  }

  return (
    <main className="admin">
      <div className="admin-head">
        <h1>Catálogo oficial</h1>
        <span className="admin-item-sub">
          {catalog.categories.length} categorias · {catalog.exercises.length} exercícios
        </span>
      </div>
      <p className="admin-note">
        Edita <code>src/data/officialCatalog.json</code> e as imagens em{' '}
        <code>public/exercises/</code> direto no repositório. Salvar baixa a imagem e converte, o
        mesmo que <code>npm run exercise-media</code> faz. O desfazer disto é o git.
      </p>

      <div className="admin-cols">
        <CategoryPanel catalog={catalog} onChange={setCatalog} />
        <ExercisePanel catalog={catalog} onChange={setCatalog} />
      </div>
    </main>
  )
}

/* ------------------------------------------------------------- categories */

function CategoryPanel({
  catalog,
  onChange,
}: {
  catalog: AdminCatalog
  onChange: (c: AdminCatalog) => void
}) {
  const toast = useToast()
  const confirm = useConfirm()
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [name, setName] = useState('')

  const start = (id: number | 'new', value: string) => {
    setEditing(id)
    setName(value)
  }

  const save = async () => {
    try {
      const { catalog: next } = await saveCategory({
        ...(editing === 'new' ? {} : { id: editing as number }),
        name,
      })
      onChange(next)
      setEditing(null)
      toast('Categoria salva.')
    } catch (e) {
      toast(e instanceof AdminRequestError ? e.message : 'Erro ao salvar.')
    }
  }

  const remove = async (id: number, label: string) => {
    const ok = await confirm({
      title: `Excluir a categoria "${label}"?`,
      // What deleting from the catalog means, as opposed to deleting a draft.
      message:
        'Os exercícios oficiais perdem esta etiqueta, e o id fica vago para sempre — nenhuma categoria futura vai reaproveitá-lo.',
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (!ok) return
    try {
      const { catalog: next } = await deleteCategory(id)
      onChange(next)
      toast('Categoria excluída.')
    } catch (e) {
      toast(e instanceof AdminRequestError ? e.message : 'Erro ao excluir.')
    }
  }

  return (
    <section className="admin-panel">
      <h2>Categorias</h2>
      <div className="admin-toolbar">
        <button className="btn primary" onClick={() => start('new', '')}>
          <Icon name="plus" /> Nova categoria
        </button>
      </div>

      {editing === 'new' && (
        <div className="admin-list" style={{ marginBottom: 12 }}>
          <div className="admin-form">
            <div>
              <label htmlFor="admin-new-category">Nome</label>
              <input
                id="admin-new-category"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="admin-actions">
              <button className="btn primary" onClick={() => void save()}>
                Salvar
              </button>
              <button className="btn subtle" onClick={() => setEditing(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-list">
        {catalog.categories.map((c) => (
          <div key={c.id} className="admin-item">
            <div className="admin-item-head">
              <span className="admin-id">{c.id}</span>
              {editing === c.id ? (
                <>
                  <input
                    aria-label={`Nome de ${c.name}`}
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <button className="btn primary" onClick={() => void save()}>
                    Salvar
                  </button>
                  <button className="btn subtle" onClick={() => setEditing(null)}>
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <span className="admin-item-name admin-open">{c.name}</span>
                  <button
                    className="icon-btn ghost"
                    aria-label={`Editar ${c.name}`}
                    onClick={() => start(c.id, c.name)}
                  >
                    <Icon name="pencil" />
                  </button>
                  <button
                    className="icon-btn ghost"
                    aria-label={`Excluir ${c.name}`}
                    onClick={() => void remove(c.id, c.name)}
                  >
                    <Icon name="trash" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- exercises */

function ExercisePanel({
  catalog,
  onChange,
}: {
  catalog: AdminCatalog
  onChange: (c: AdminCatalog) => void
}) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<number | 'new' | null>(null)

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = q
      ? catalog.exercises.filter((e) => e.name.toLowerCase().includes(q))
      : catalog.exercises
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [catalog.exercises, search])

  const categoryNames = (e: AdminExercise) =>
    (e.categoryIds ?? [])
      .map((id) => catalog.categories.find((c) => c.id === id)?.name)
      .filter(Boolean)
      .join(', ') || 'Sem categoria'

  return (
    <section className="admin-panel">
      <h2>Exercícios</h2>
      <div className="admin-toolbar">
        <input
          type="search"
          aria-label="Buscar exercício"
          placeholder="Buscar…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn primary" onClick={() => setOpen(open === 'new' ? null : 'new')}>
          <Icon name="plus" /> Novo exercício
        </button>
      </div>

      {open === 'new' && (
        <div className="admin-list" style={{ marginBottom: 12 }}>
          <div className="admin-item">
            <ExerciseForm
              key="new"
              exercise={null}
              catalog={catalog}
              onChange={onChange}
              onDone={() => setOpen(null)}
            />
          </div>
        </div>
      )}

      <div className="admin-list">
        {shown.map((e) => (
          <div key={e.id} className="admin-item">
            <div className="admin-item-head">
              <span className="admin-id">{e.id}</span>
              <button
                className="admin-open"
                aria-expanded={open === e.id}
                onClick={() => setOpen(open === e.id ? null : e.id)}
              >
                {e.mediaFile ? (
                  <img
                    className="admin-thumb"
                    src={`${import.meta.env.BASE_URL}exercises/${e.mediaFile}`}
                    alt=""
                  />
                ) : (
                  <span className="admin-thumb" />
                )}
                <span style={{ minWidth: 0 }}>
                  <span className="admin-item-name">{e.name}</span>
                  <br />
                  <span className="admin-item-sub">
                    {e.kind === 'cardio' ? 'Cardio' : 'Força'} · {categoryNames(e)}
                    {e.mediaFile ? '' : ' · sem imagem'}
                  </span>
                </span>
              </button>
              <Icon name={open === e.id ? 'chevron-up' : 'chevron-down'} />
            </div>

            {open === e.id && (
              <ExerciseForm
                key={e.id}
                exercise={e}
                catalog={catalog}
                onChange={onChange}
                onDone={() => setOpen(null)}
              />
            )}
          </div>
        ))}
        {shown.length === 0 && (
          <div className="admin-item">
            <div className="admin-item-head">
              <span className="admin-item-sub">Nenhum exercício com esse nome.</span>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function ExerciseForm({
  exercise,
  catalog,
  onChange,
  onDone,
}: {
  exercise: AdminExercise | null
  catalog: AdminCatalog
  onChange: (c: AdminCatalog) => void
  onDone: () => void
}) {
  const toast = useToast()
  const confirm = useConfirm()
  const [draft, setDraft] = useState<Draft>(() => toDraft(exercise))
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const id = exercise?.id
  const fieldId = (name: string) => `admin-ex-${id ?? 'new'}-${name}`

  const save = async () => {
    setSaving(true)
    setStatus(null)
    try {
      const { catalog: next, warning } = await saveExercise({
        ...(id != null ? { id } : {}),
        name: draft.name,
        kind: draft.kind,
        categoryIds: draft.categoryIds,
        alternativeIds: draft.alternativeIds,
        videos: draft.videos,
        ...(draft.mediaUrl.trim() ? { mediaUrl: draft.mediaUrl.trim() } : {}),
      })
      onChange(next)
      // The address was an instruction, and it has been carried out; leaving it
      // in the box would look like a stored field that never matches the file.
      set('mediaUrl', '')
      setStatus(warning ? { tone: 'bad', text: warning } : { tone: 'ok', text: 'Salvo.' })
      if (id == null) onDone()
    } catch (e) {
      setStatus({
        tone: 'bad',
        text: e instanceof AdminRequestError ? e.message : 'Erro ao salvar.',
      })
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (id == null) return
    const ok = await confirm({
      title: `Excluir "${exercise?.name}"?`,
      // Deleting from the published catalog is not deleting a draft, and this
      // is the sentence that says so.
      message:
        `O id ${id} fica vago para sempre e não será reaproveitado. ` +
        'Aparelhos que já registraram peso, histórico, observação ou foto neste exercício ficam ' +
        'com registros que deixam de resolver — eles não são apagados, mas também não voltam a ' +
        'fazer sentido.',
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (!ok) return
    try {
      const { catalog: next } = await deleteExercise(id)
      onChange(next)
      onDone()
      toast('Exercício excluído.')
    } catch (e) {
      toast(e instanceof AdminRequestError ? e.message : 'Erro ao excluir.')
    }
  }

  return (
    <div className="admin-form">
      <div className="admin-form-row">
        <div>
          <label htmlFor={fieldId('name')}>Nome</label>
          <input
            id={fieldId('name')}
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor={fieldId('kind')}>Tipo</label>
          <select
            id={fieldId('kind')}
            value={draft.kind}
            onChange={(e) => set('kind', e.target.value as Draft['kind'])}
          >
            <option value="strength">Força</option>
            <option value="cardio">Cardio</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor={fieldId('media')}>URL da imagem</label>
        <input
          id={fieldId('media')}
          placeholder={exercise?.mediaFile ?? 'https://…'}
          value={draft.mediaUrl}
          onChange={(e) => set('mediaUrl', e.target.value)}
        />
        <p className="admin-item-sub">
          {exercise?.mediaFile
            ? `Hoje: ${exercise.mediaFile}. Informe uma URL para trocar.`
            : 'Sem imagem. A URL é baixada e convertida ao salvar.'}
        </p>
      </div>

      <div className="admin-form-row">
        <div>
          <label id={fieldId('cats-label')}>Categorias</label>
          <div className="admin-picker" role="group" aria-labelledby={fieldId('cats-label')}>
            {catalog.categories.map((c) => (
              <label key={c.id}>
                <input
                  type="checkbox"
                  checked={draft.categoryIds.includes(c.id)}
                  onChange={() => set('categoryIds', toggle(draft.categoryIds, c.id))}
                />
                {c.name}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label id={fieldId('alts-label')}>Alternativas</label>
          <div className="admin-picker" role="group" aria-labelledby={fieldId('alts-label')}>
            {catalog.exercises
              .filter((o) => o.id !== id)
              .map((o) => (
                <label key={o.id}>
                  <input
                    type="checkbox"
                    checked={draft.alternativeIds.includes(o.id)}
                    onChange={() => set('alternativeIds', toggle(draft.alternativeIds, o.id))}
                  />
                  {o.name}
                </label>
              ))}
          </div>
        </div>
      </div>

      <div>
        <label>Vídeos</label>
        <div className="admin-videos">
          {draft.videos.map((v, i) => (
            <div key={i} className="admin-video">
              <input
                aria-label={`Título do vídeo ${i + 1}`}
                placeholder="Título"
                value={v.title ?? ''}
                onChange={(e) =>
                  set(
                    'videos',
                    draft.videos.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)),
                  )
                }
              />
              <input
                aria-label={`URL do vídeo ${i + 1}`}
                placeholder="https://…"
                value={v.url}
                onChange={(e) =>
                  set(
                    'videos',
                    draft.videos.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)),
                  )
                }
              />
              <button
                className="icon-btn ghost"
                aria-label={`Remover vídeo ${i + 1}`}
                onClick={() =>
                  set(
                    'videos',
                    draft.videos.filter((_, j) => j !== i),
                  )
                }
              >
                <Icon name="trash" />
              </button>
            </div>
          ))}
          <div>
            <button
              className="btn subtle"
              onClick={() => set('videos', [...draft.videos, { url: '' }])}
            >
              <Icon name="plus" /> Adicionar vídeo
            </button>
          </div>
        </div>
      </div>

      <div className="admin-actions">
        <button className="btn primary" disabled={saving} onClick={() => void save()}>
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
        {id != null && (
          <button className="btn subtle" onClick={() => void remove()}>
            Excluir
          </button>
        )}
        {status && (
          <span className={`admin-status ${status.tone}`} role="status">
            {status.text}
          </span>
        )}
      </div>
    </div>
  )
}
