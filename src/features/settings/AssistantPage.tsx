import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ALL_SECTIONS,
  SECTIONS,
  SECTION_LABEL,
  type Section,
  type SectionSelection,
} from '../../data/catalogPayload'
import { requiredSections } from '../../data/catalogProposal'
import { useAssistantChat, type ChatEntry } from '../../state/assistantChat'
import { useAssistantToken } from '../../state/assistantToken'
import { ActionBar } from '../../ui/ActionBar'
import { BackBar } from '../../ui/Chrome'
import { useConfirm, useToast } from '../../ui/Feedback'
import { Icon } from '../../ui/Icon'
import './assistant.css'

/* ------------------------------------------------------------------ token */

function TokenPanel() {
  const token = useAssistantToken((s) => s.token)
  const setToken = useAssistantToken((s) => s.setToken)
  const clear = useAssistantToken((s) => s.clear)
  const confirm = useConfirm()
  const toast = useToast()

  const [draft, setDraft] = useState('')
  const [reveal, setReveal] = useState(false)
  const [editing, setEditing] = useState(false)

  const onRemove = async () => {
    const ok = await confirm({
      title: 'Apagar a chave?',
      message: 'O assistente para de funcionar até você informar uma chave de novo.',
      confirmLabel: 'Apagar',
      danger: true,
    })
    if (!ok) return
    clear()
    toast('Token apagado.')
  }

  if (token && !editing) {
    return (
      <div className="group">
        <button className="row" onClick={() => setEditing(true)}>
          <span className="row-ic">
            <Icon name="key" />
          </span>
          <span className="row-body">
            <span className="row-title">Chave salva</span>
            <span className="row-sub">Toque para trocar ou apagar</span>
          </span>
          <Icon name="chevron-right" className="chev" />
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="group-label">Chave da API</div>
      <div className="group as-token">
        {!token && (
          <p className="group-note">
            O assistente fala com a API do Gemini, do Google. Informe uma chave da{' '}
            <strong>sua</strong> conta para usá-lo — cada conversa consome a cota dela. Você gera
            uma em aistudio.google.com.
          </p>
        )}
        <div className="field">
          <label htmlFor="assistant-key">Chave</label>
          <input
            id="assistant-key"
            type={reveal ? 'text' : 'password'}
            autoComplete="off"
            placeholder="AIza..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        </div>
        <div className="as-token-actions">
          <button className="btn subtle" onClick={() => setReveal((v) => !v)}>
            <Icon name={reveal ? 'eye-off' : 'eye'} />
            {reveal ? 'Ocultar' : 'Mostrar'}
          </button>
          <button
            className="btn primary"
            disabled={!draft.trim()}
            onClick={() => {
              setToken(draft)
              setDraft('')
              setEditing(false)
              setReveal(false)
              toast('Chave salva.')
            }}
          >
            Salvar
          </button>
        </div>
        {/* Not a disclaimer to bury: without a backend there is nowhere else for
            the key to live, and the honest thing is to say so. */}
        <p className="group-note warn">
          <Icon name="alert-triangle" size={12} /> A chave fica <strong>neste navegador</strong> e
          qualquer script na página consegue lê-la. Use uma chave dedicada, com limite de uso.
        </p>
        {token && (
          <button className="btn danger" onClick={() => void onRemove()}>
            Apagar chave
          </button>
        )}
      </div>
    </>
  )
}

/* ---------------------------------------------------------------- proposal */

function ImpactLine({ section, impact }: { section: Section; impact: ChatEntry & { kind: 'proposal' } }) {
  const s = impact.impact[section]
  const bits = [
    s.created > 0 && `${s.created} novo${s.created > 1 ? 's' : ''}`,
    s.updated > 0 && `${s.updated} alterado${s.updated > 1 ? 's' : ''}`,
  ].filter(Boolean) as string[]

  return (
    <>
      <span className="as-impact">{bits.length ? bits.join(' · ') : 'sem mudanças'}</span>
      {s.removed > 0 && (
        <span className="as-impact danger">
          {s.removed} removido{s.removed > 1 ? 's' : ''}: {s.removedNames.join(', ')}
        </span>
      )}
    </>
  )
}

function ProposalCard({ entry }: { entry: ChatEntry & { kind: 'proposal' } }) {
  const accept = useAssistantChat((s) => s.accept)
  const reject = useAssistantChat((s) => s.reject)
  const [selection, setSelection] = useState<SectionSelection>(ALL_SECTIONS)
  const [busy, setBusy] = useState(false)

  const required = requiredSections(entry.proposal, selection)
  const chosen = SECTIONS.filter((s) => selection[s])

  const toggle = (section: Section) => {
    if (required.has(section)) return // locked on by something still selected
    const next = { ...selection, [section]: !selection[section] }
    // Turning a section ON can drag in what it depends on.
    for (const dep of requiredSections(entry.proposal, next)) next[dep] = true
    setSelection(next)
  }

  if (entry.decision) {
    const { accepted, applied, skipped } = entry.decision
    return (
      <div className="as-card decided">
        <p className="as-summary">{entry.proposal.summary}</p>
        <p className={`as-verdict ${accepted ? 'ok' : ''}`}>
          {accepted ? (
            <>
              <Icon name="check" size={13} /> Aplicado:{' '}
              {applied.map((s) => SECTION_LABEL[s as Section]).join(', ')}
              {skipped.length > 0 && (
                <>
                  {' · '}
                  <span className="as-skipped">
                    fora: {skipped.map((s) => SECTION_LABEL[s as Section]).join(', ')}
                  </span>
                </>
              )}
            </>
          ) : (
            <>
              <Icon name="x" size={13} /> Recusado — diga o que ajustar na próxima mensagem.
            </>
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="as-card">
      <p className="as-summary">{entry.proposal.summary}</p>

      <ul className="as-sections">
        {SECTIONS.map((section) => {
          const locked = required.has(section)
          return (
            <li key={section}>
              <label className={locked ? 'locked' : ''}>
                <input
                  type="checkbox"
                  checked={selection[section]}
                  disabled={locked}
                  onChange={() => toggle(section)}
                />
                <span className="as-section-body">
                  <span className="as-section-title">{SECTION_LABEL[section]}</span>
                  <ImpactLine section={section} impact={entry} />
                  {locked && (
                    <span className="as-locked">
                      Necessária: outra parte selecionada usa o que ela cria.
                    </span>
                  )}
                </span>
              </label>
            </li>
          )
        })}
      </ul>

      {/* Before the buttons, never after: a repair the person only learns about
          once it is applied is not something they agreed to. */}
      {entry.repairs.length > 0 && (
        <div className="as-repairs">
          <p className="as-repairs-title">
            <Icon name="alert-triangle" size={12} /> Ajustes na proposta
          </p>
          <ul>
            {entry.repairs.map((repair, i) => (
              <li key={i}>{repair.text}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="group-note">
        Aplicar reescreve o catálogo. Vale <Link to="/settings/data">exportar um backup</Link> antes.
      </p>

      <div className="as-decide">
        <button className="btn subtle" disabled={busy} onClick={() => reject(entry.id)}>
          Rejeitar
        </button>
        <button
          className="btn primary"
          disabled={busy || chosen.length === 0}
          onClick={async () => {
            setBusy(true)
            try {
              await accept(entry.id, selection)
            } finally {
              setBusy(false)
            }
          }}
        >
          {chosen.length === SECTIONS.length ? 'Aceitar' : `Aplicar ${chosen.length} de 3`}
        </button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------- page */

function Entry({ entry }: { entry: ChatEntry }) {
  switch (entry.kind) {
    case 'user':
      return <div className="as-msg user">{entry.text}</div>
    case 'assistant':
      return <div className="as-msg bot">{entry.text}</div>
    case 'error':
      return (
        <div className="as-msg error">
          <Icon name="alert-triangle" size={13} /> {entry.text}
        </div>
      )
    case 'proposal':
      return <ProposalCard entry={entry} />
  }
}

export function AssistantPage() {
  const token = useAssistantToken((s) => s.token)
  const entries = useAssistantChat((s) => s.entries)
  const status = useAssistantChat((s) => s.status)
  const pending = useAssistantChat((s) => s.pending)
  const send = useAssistantChat((s) => s.send)
  const reset = useAssistantChat((s) => s.reset)

  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const busy = status === 'working'
  const blocked = pending !== null
  const canSend = !!token && !busy && !blocked && draft.trim().length > 0

  // Follow the tail as the thread grows and as text streams in.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [entries.length, streaming])

  const onSend = async () => {
    if (!canSend) return
    const text = draft
    setDraft('')
    setStreaming('')
    await send(text, (chunk) => setStreaming((s) => s + chunk))
    setStreaming('')
  }

  return (
    <>
      <BackBar title="Assistente (IA)" to="/settings" />
      <main className={`screen${token ? ' has-action-bar' : ''}`}>
        <TokenPanel />

        {token && (
          <>
            {entries.length === 0 && !busy && (
              <div className="as-intro">
                <p>
                  Peça o que quiser sobre <strong>categorias</strong>, <strong>exercícios</strong> e{' '}
                  <strong>dias de treino</strong> — em português, do seu jeito.
                </p>
                <p className="as-examples">
                  “redistribui os exercícios entre os dias equilibrando os grupos musculares” ·
                  “arruma as categorias” · “acha imagens para os exercícios sem imagem”
                </p>
                <p className="group-note">
                  Se faltar informação, ele pergunta antes de propor. Nada é gravado sem você aceitar.
                </p>
              </div>
            )}

            <div className="as-thread">
              {entries.map((entry) => (
                <Entry key={entry.id} entry={entry} />
              ))}
              {busy && (
                <div className="as-msg bot">
                  {streaming || <span className="as-thinking">pensando…</span>}
                </div>
              )}
              <div ref={endRef} />
            </div>

            {entries.length > 0 && !busy && (
              <button className="btn subtle as-new" onClick={reset}>
                <Icon name="refresh" /> Nova conversa
              </button>
            )}
          </>
        )}
      </main>

      {token && (
        <ActionBar>
          <div className="as-composer">
            <textarea
              className="note-input"
              rows={2}
              placeholder={blocked ? 'Decida a proposta acima primeiro' : 'O que você quer ajustar?'}
              value={draft}
              disabled={busy || blocked}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends; Shift+Enter keeps the newline for longer briefs.
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void onSend()
                }
              }}
            />
            <button
              className="btn primary as-send"
              aria-label="Enviar"
              disabled={!canSend}
              onClick={() => void onSend()}
            >
              <Icon name="send" />
            </button>
          </div>
        </ActionBar>
      )}
    </>
  )
}
