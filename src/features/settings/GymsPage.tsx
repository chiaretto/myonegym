import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import { createGym, deleteGym, renameGym, ValidationError } from '../../db/repos'
import { db } from '../../db/db'
import type { Gym } from '../../db/types'
import { useGyms } from '../../lib/hooks'
import { useActiveGym } from '../../state/activeGym'
import { ActionBar } from '../../ui/ActionBar'
import { BackBar } from '../../ui/Chrome'
import { useConfirm, useToast } from '../../ui/Feedback'
import { Icon } from '../../ui/Icon'

export function GymsPage() {
  const gyms = useGyms()
  const { activeGymId, setActiveGym, reconcile } = useActiveGym()
  const toast = useToast()
  const confirm = useConfirm()
  const nav = useNavigate()

  const onDelete = async (g: Gym) => {
    const ok = await confirm({
      title: `Excluir "${g.name}"?`,
      message: 'Os pesos e o histórico desta academia serão removidos.',
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (!ok) return
    await deleteGym(g.id!, db)
    await reconcile()
    toast('Academia excluída.')
  }

  return (
    <>
      <BackBar title="Academias" to="/settings" />
      <main className="screen has-action-bar">
        {gyms && gyms.length === 0 && (
          <div className="empty">
            <span className="big">🏢</span>
            <h2>Nenhuma academia</h2>
            <p>Comece criando a sua primeira academia — os pesos são salvos por academia.</p>
          </div>
        )}

        <div className="group">
          {gyms?.map((g) => (
            <div key={g.id} className="row">
              <span className="row-ic">
                <Icon name="building" />
              </span>
              <span className="row-body">
                <span className="row-title">{g.name}</span>
                {g.id === activeGymId && <span className="row-sub warn">Ativa</span>}
              </span>
              {g.id !== activeGymId && (
                <button
                  className="icon-btn ghost"
                  aria-label="Tornar ativa"
                  onClick={() => setActiveGym(g.id!)}
                >
                  <Icon name="circle" />
                </button>
              )}
              <button
                className="icon-btn ghost"
                aria-label="Editar"
                onClick={() => nav(`/settings/gyms/${g.id}/edit`)}
              >
                <Icon name="pencil" />
              </button>
              <button className="icon-btn ghost" aria-label="Excluir" onClick={() => onDelete(g)}>
                <Icon name="trash" />
              </button>
            </div>
          ))}
        </div>
      </main>

      <ActionBar>
        <button className="btn primary" onClick={() => nav('/settings/gyms/new')}>
          <Icon name="plus" /> Nova academia
        </button>
      </ActionBar>
    </>
  )
}

export function GymFormPage() {
  const { id } = useParams()
  const editId = id != null ? Number(id) : null
  const gym = useLiveQuery(
    async () => (editId == null ? null : ((await db.gyms.get(editId)) ?? null)),
    [editId],
    editId == null ? null : undefined,
  )

  if (editId != null && gym === undefined) {
    return <BackBar title="Editar academia" to="/settings/gyms" />
  }
  if (editId != null && gym === null) {
    return (
      <>
        <BackBar title="Editar academia" to="/settings/gyms" />
        <div className="empty">
          <p>Academia não encontrada.</p>
        </div>
      </>
    )
  }

  return <GymForm gym={gym ?? null} />
}

function GymForm({ gym }: { gym: Gym | null }) {
  const gyms = useGyms()
  const { setActiveGym, reconcile } = useActiveGym()
  const toast = useToast()
  const nav = useNavigate()
  const [name, setName] = useState(gym?.name ?? '')
  const [copyFrom, setCopyFrom] = useState<number | ''>('')
  const [err, setErr] = useState('')

  const back = () => nav('/settings/gyms')

  const submit = async () => {
    try {
      if (gym) {
        await renameGym(gym.id!, name, db)
        toast('Academia atualizada.')
      } else {
        const wasFirst = (gyms?.length ?? 0) === 0
        const id = await createGym(name, copyFrom === '' ? undefined : Number(copyFrom), db)
        // The very first gym becomes the active one (same effect the list had).
        if (wasFirst && id != null) setActiveGym(id)
        await reconcile()
        toast('Academia criada.')
      }
      back()
    } catch (e) {
      setErr(e instanceof ValidationError ? e.message : 'Erro ao salvar.')
    }
  }

  return (
    <>
      <BackBar title={gym ? 'Editar academia' : 'Nova academia'} to="/settings/gyms" />
      <main className="screen has-action-bar">
        <div className="field">
          <label htmlFor="gym-name">Nome</label>
          <input
            id="gym-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            placeholder="Ex.: Academia Central"
          />
          {err && <span className="err">{err}</span>}
        </div>

        {!gym && (gyms?.length ?? 0) > 0 && (
          <div className="field">
            <label htmlFor="gym-copy">Copiar pesos de (opcional)</label>
            <select
              id="gym-copy"
              value={copyFrom}
              onChange={(e) => setCopyFrom(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">Não copiar</option>
              {gyms?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        )}
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
