import { useState } from 'react'
import { createCategory, deleteCategory, renameCategory, ValidationError } from '../../db/repos'
import { db } from '../../db/db'
import type { Category } from '../../db/types'
import { useCategories } from '../../lib/hooks'
import { BackBar } from '../../ui/Chrome'
import { useConfirm, useToast } from '../../ui/Feedback'
import { Icon } from '../../ui/Icon'
import { Sheet } from '../../ui/Sheet'

export function CategoriesPage() {
  const cats = useCategories()
  const toast = useToast()
  const confirm = useConfirm()
  const [editing, setEditing] = useState<Category | 'new' | null>(null)

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
      <main className="screen">
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
                <button className="icon-btn ghost" aria-label="Editar" onClick={() => setEditing(c)}>
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

        <button className="btn primary" style={{ marginTop: 14 }} onClick={() => setEditing('new')}>
          <Icon name="plus" /> Nova categoria
        </button>
      </main>

      {editing && (
        <CategoryForm category={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
    </>
  )
}

function CategoryForm({ category, onClose }: { category: Category | null; onClose: () => void }) {
  const toast = useToast()
  const [name, setName] = useState(category?.name ?? '')
  const [err, setErr] = useState('')

  const submit = async () => {
    try {
      if (category) {
        await renameCategory(category.id!, name, db)
        toast('Categoria atualizada.')
      } else {
        await createCategory(name, db)
        toast('Categoria criada.')
      }
      onClose()
    } catch (e) {
      setErr(e instanceof ValidationError ? e.message : 'Erro ao salvar.')
    }
  }

  return (
    <Sheet title={category ? 'Editar categoria' : 'Nova categoria'} onClose={onClose}>
      <div className="field">
        <label htmlFor="cat-name">Nome</label>
        <input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Ex.: Peito" />
        {err && <span className="err">{err}</span>}
      </div>
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
