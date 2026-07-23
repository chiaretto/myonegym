import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import { createCategory, deleteCategory, renameCategory, ValidationError } from '../../db/repos'
import { db } from '../../db/db'
import type { Category } from '../../db/types'
import { useCategories } from '../../lib/hooks'
import { ActionBar } from '../../ui/ActionBar'
import { BackBar } from '../../ui/Chrome'
import { useConfirm, useToast } from '../../ui/Feedback'
import { Icon } from '../../ui/Icon'

export function CategoriesPage() {
  const cats = useCategories()
  const toast = useToast()
  const confirm = useConfirm()
  const nav = useNavigate()

  const onDelete = async (c: Category) => {
    if (c.reserved) {
      toast('"Sem categoria" não pode ser excluída.')
      return
    }
    const ok = await confirm({
      title: `Excluir "${c.name}"?`,
      message: 'Os exercícios desta categoria serão movidos para "Sem categoria".',
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteCategory(c.id!, db)
      toast('Categoria excluída.')
    } catch (e) {
      toast(e instanceof ValidationError ? e.message : 'Erro ao excluir.')
    }
  }

  return (
    <>
      <BackBar title="Categorias" to="/settings" />
      <main className="screen has-action-bar">
        {cats && cats.length === 0 && (
          <div className="empty">
            <span className="big">🏷️</span>
            <h2>Nenhuma categoria</h2>
            <p>Crie grupos musculares como Peito, Costas, Bíceps…</p>
          </div>
        )}

        <div className="group">
          {cats?.map((c) => (
            <div key={c.id} className="row">
              <span className="row-ic">
                <Icon name="tag" />
              </span>
              <span className="row-body">
                <span className="row-title">{c.name}</span>
                {c.reserved && <span className="row-sub">Reservada</span>}
              </span>
              {!c.reserved && (
                <button
                  className="icon-btn ghost"
                  aria-label="Editar"
                  onClick={() => nav(`/settings/categories/${c.id}/edit`)}
                >
                  <Icon name="pencil" />
                </button>
              )}
              {!c.reserved && (
                <button className="icon-btn ghost" aria-label="Excluir" onClick={() => onDelete(c)}>
                  <Icon name="trash" />
                </button>
              )}
            </div>
          ))}
        </div>
      </main>

      <ActionBar>
        <button className="btn primary" onClick={() => nav('/settings/categories/new')}>
          <Icon name="plus" /> Nova categoria
        </button>
      </ActionBar>
    </>
  )
}

export function CategoryFormPage() {
  const { id } = useParams()
  const editId = id != null ? Number(id) : null
  // undefined = loading, null = not found (or create mode), Category = found.
  const category = useLiveQuery(
    async () => (editId == null ? null : ((await db.categories.get(editId)) ?? null)),
    [editId],
    editId == null ? null : undefined,
  )

  if (editId != null && category === undefined) {
    return <BackBar title="Editar categoria" to="/settings/categories" />
  }
  if (editId != null && category === null) {
    return (
      <>
        <BackBar title="Editar categoria" to="/settings/categories" />
        <div className="empty">
          <p>Categoria não encontrada.</p>
        </div>
      </>
    )
  }

  return <CategoryForm category={category ?? null} />
}

function CategoryForm({ category }: { category: Category | null }) {
  const toast = useToast()
  const nav = useNavigate()
  const [name, setName] = useState(category?.name ?? '')
  const [err, setErr] = useState('')

  const back = () => nav('/settings/categories')

  const submit = async () => {
    try {
      if (category) {
        await renameCategory(category.id!, name, db)
        toast('Categoria atualizada.')
      } else {
        await createCategory(name, db)
        toast('Categoria criada.')
      }
      back()
    } catch (e) {
      setErr(e instanceof ValidationError ? e.message : 'Erro ao salvar.')
    }
  }

  return (
    <>
      <BackBar title={category ? 'Editar categoria' : 'Nova categoria'} to="/settings/categories" />
      <main className="screen has-action-bar">
        <div className="field">
          <label htmlFor="cat-name">Nome</label>
          <input
            id="cat-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            placeholder="Ex.: Peito"
          />
          {err && <span className="err">{err}</span>}
        </div>
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
