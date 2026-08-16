import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import { createWarmup, deleteWarmup, updateWarmup, ValidationError } from '../../db/repos'
import { db } from '../../db/db'
import type { Warmup } from '../../db/types'
import { useExercises, useWarmups } from '../../lib/hooks'
import { warmupLinkLabel, warmupMediaKind } from '../../lib/warmupMedia'
import { ActionBar } from '../../ui/ActionBar'
import { BackBar } from '../../ui/Chrome'
import { useConfirm, useToast } from '../../ui/Feedback'
import { Icon } from '../../ui/Icon'
import { Media } from '../../ui/Media'

/** The glyph that stands for a warm-up whose media is not an image. */
function KindIcon({ url }: { url: string }) {
  const kind = warmupMediaKind(url)
  // Anything not playable is tried as an image; `Media` falls back to its own
  // placeholder when the URL turns out not to be one.
  if (kind === 'image') return <Media className="thumb" url={url} alt="" />
  return (
    <span className="row-ic">
      <Icon name="player-play" />
    </span>
  )
}

export function WarmupsPage() {
  const warmups = useWarmups()
  const exercises = useExercises()
  const toast = useToast()
  const confirm = useConfirm()
  const nav = useNavigate()

  /** How many exercises link each warm-up — the list's only useful number. */
  const usedBy = (id: number) => (exercises ?? []).filter((e) => e.warmupIds?.includes(id)).length

  const onDelete = async (w: Warmup) => {
    const n = usedBy(w.id!)
    const ok = await confirm({
      title: `Excluir "${w.name}"?`,
      message: n
        ? `Ele sairá de ${n} ${n === 1 ? 'exercício' : 'exercícios'}. Os exercícios em si não são afetados.`
        : 'Este aquecimento não está em nenhum exercício.',
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteWarmup(w.id!, db)
      toast('Aquecimento excluído.')
    } catch (e) {
      toast(e instanceof ValidationError ? e.message : 'Erro ao excluir.')
    }
  }

  return (
    <>
      <BackBar title="Aquecimentos" to="/settings" />
      <main className="screen has-action-bar">
        {warmups && warmups.length === 0 && (
          <div className="empty">
            <span className="big">🤸</span>
            <h2>Nenhum aquecimento</h2>
            <p>
              Cadastre imagens, vídeos ou links de preparo e vincule-os aos exercícios que os usam.
              O mesmo aquecimento serve vários exercícios.
            </p>
          </div>
        )}

        <div className="group">
          {warmups?.map((w) => {
            const n = usedBy(w.id!)
            return (
              <div key={w.id} className="row">
                <KindIcon url={w.url} />
                <span className="row-body">
                  <span className="row-title">{w.name}</span>
                  <span className="row-sub">{warmupLinkLabel(w.url)}</span>
                  <span className="row-sub" style={{ color: 'var(--text-muted)' }}>
                    {n === 0
                      ? 'Nenhum exercício'
                      : `${n} ${n === 1 ? 'exercício' : 'exercícios'}`}
                  </span>
                </span>
                <button
                  className="icon-btn ghost"
                  aria-label="Editar"
                  onClick={() => nav(`/settings/warmups/${w.id}/edit`)}
                >
                  <Icon name="pencil" />
                </button>
                <button className="icon-btn ghost" aria-label="Excluir" onClick={() => onDelete(w)}>
                  <Icon name="trash" />
                </button>
              </div>
            )
          })}
        </div>
      </main>

      <ActionBar>
        <button className="btn primary" onClick={() => nav('/settings/warmups/new')}>
          <Icon name="plus" /> Novo aquecimento
        </button>
      </ActionBar>
    </>
  )
}

export function WarmupFormPage() {
  const { id } = useParams()
  const editId = id != null ? Number(id) : null
  // undefined = loading, null = not found (or create mode), Warmup = found.
  const warmup = useLiveQuery(
    async () => (editId == null ? null : ((await db.warmups.get(editId)) ?? null)),
    [editId],
    editId == null ? null : undefined,
  )

  if (editId != null && warmup === undefined) {
    return <BackBar title="Editar aquecimento" to="/settings/warmups" />
  }
  if (editId != null && warmup === null) {
    return (
      <>
        <BackBar title="Editar aquecimento" to="/settings/warmups" />
        <div className="empty">
          <p>Aquecimento não encontrado.</p>
        </div>
      </>
    )
  }

  return <WarmupForm warmup={warmup ?? null} />
}

function WarmupForm({ warmup }: { warmup: Warmup | null }) {
  const toast = useToast()
  const nav = useNavigate()
  const [name, setName] = useState(warmup?.name ?? '')
  const [url, setUrl] = useState(warmup?.url ?? '')
  const [err, setErr] = useState('')

  const back = () => nav('/settings/warmups')
  const kind = url.trim() ? warmupMediaKind(url) : null

  const submit = async () => {
    try {
      if (warmup) {
        await updateWarmup(warmup.id!, { name, url }, db)
        toast('Aquecimento atualizado.')
      } else {
        await createWarmup({ name, url }, db)
        toast('Aquecimento criado.')
      }
      back()
    } catch (e) {
      setErr(e instanceof ValidationError ? e.message : 'Erro ao salvar.')
    }
  }

  return (
    <>
      <BackBar title={warmup ? 'Editar aquecimento' : 'Novo aquecimento'} to="/settings/warmups" />
      <main className="screen has-action-bar">
        <div className="field">
          <label htmlFor="wu-name">Nome</label>
          <input
            id="wu-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            placeholder="Ex.: Rotação de ombro"
          />
        </div>
        <div className="field">
          <label htmlFor="wu-url">URL da imagem, vídeo ou página</label>
          <input
            id="wu-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
          />
          {/* Says what the app made of the URL BEFORE saving — the difference
              between "vai tocar aqui" and "vai abrir fora" is not obvious from
              the address alone. */}
          {kind && (
            <small className="hint">
              {kind === 'image' && 'Imagem — será exibida no visualizador.'}
              {kind === 'video' && 'Vídeo — será tocado no visualizador, sem começar sozinho.'}
              {kind === 'embed' && `Vídeo do ${warmupLinkLabel(url)} — será embutido no visualizador.`}
            </small>
          )}
          {err && <span className="err">{err}</span>}
        </div>
        {kind === 'image' && (
          <div className="hero">
            <Media className="hero-media" url={url} alt="Pré-visualização do aquecimento" />
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
