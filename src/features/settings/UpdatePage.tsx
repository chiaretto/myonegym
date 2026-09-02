import { useState } from 'react'
import { buildInfo, useAppUpdate } from '../../lib/appUpdate'
import { ActionBar } from '../../ui/ActionBar'
import { BackBar } from '../../ui/Chrome'
import { Icon } from '../../ui/Icon'
import './install.css'
import './update.css'

/** The installed icon, as on the install screen — same app, same lockup. */
const appIcon = `${import.meta.env.BASE_URL}pwa-192x192.png`

/** "01/09/2026 11:22". Date **and** time: several builds can land on one day.
 *  The comma pt-BR puts between the two goes — this reads as one stamp. */
export function fmtStamp(date: Date): string {
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).replace(',', '')
}

/** Just the clock, for "última verificação" — the date is almost always today. */
function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function UpdatePage() {
  const status = useAppUpdate((s) => s.status)
  const lastCheckedAt = useAppUpdate((s) => s.lastCheckedAt)
  const checkForUpdate = useAppUpdate((s) => s.checkForUpdate)
  const [busy, setBusy] = useState(false)

  const onCheck = async () => {
    setBusy(true)
    try {
      await checkForUpdate()
    } finally {
      setBusy(false)
    }
  }

  // A new version applies itself: the page reloads as soon as the new worker
  // activates. Keeping the button pressed-out until then stops a second check
  // being fired at a version that is already on its way in.
  const checking = busy || status === 'checking'
  const canCheck = status !== 'unsupported'

  const outcome = {
    idle: {
      icon: 'refresh',
      title: 'Procurar atualização',
      sub: 'O app também procura sozinho quando você volta para ele.',
    },
    checking: {
      icon: 'refresh',
      title: 'Procurando atualização…',
      sub: 'Consultando o servidor.',
    },
    uptodate: {
      icon: 'circle-check',
      title: 'Você já está na versão mais recente',
      sub: 'Nada a atualizar por aqui.',
    },
    updating: {
      icon: 'download',
      title: 'Nova versão encontrada',
      sub: 'Aplicando agora — o app vai recarregar sozinho.',
    },
    error: {
      icon: 'alert-triangle',
      title: 'Não foi possível verificar',
      sub: 'Sem conexão? O app continua funcionando com a versão que já tem.',
    },
    unsupported: null,
  }[status]

  return (
    <>
      <BackBar title="Atualizar app" to="/settings" />
      <main className={`screen${canCheck ? ' has-action-bar' : ''}`}>
        <div className="install-hero">
          <img src={appIcon} alt="" />
          <span className="wordmark" aria-label="MyOneGym">
            My<em>One</em>Gym
          </span>
          <p>
            Uma versão nova nem sempre chega sozinha ao app instalado — o aparelho só procura
            quando recarrega a página, e o app aberto pelo ícone quase nunca recarrega. Aqui você
            pede.
          </p>
        </div>

        <div className="group-label">Versão instalada</div>
        <div className="group">
          <div className="row">
            <span className="row-ic">
              <Icon name="tag" />
            </span>
            <span className="row-body">
              <span className="row-title">Versão {buildInfo.version}</span>
              <span className="row-sub">
                {buildInfo.builtAt ? `Build de ${fmtStamp(buildInfo.builtAt)}` : 'Build sem data'}
              </span>
            </span>
          </div>
        </div>

        {outcome && (
          <>
            <div className="group-label">Atualização</div>
            <div className="group">
              <div className="row">
                <span className={`row-ic${checking ? ' update-spin' : ''}`}>
                  <Icon name={outcome.icon} />
                </span>
                <span className="row-body">
                  <span className="row-title">{outcome.title}</span>
                  <span className="row-sub">{outcome.sub}</span>
                </span>
              </div>
            </div>
            {lastCheckedAt != null && (
              <p className="install-note">Última verificação às {fmtTime(lastCheckedAt)}.</p>
            )}
          </>
        )}

        {status === 'unsupported' && (
          <>
            <div className="group-label">Atualização</div>
            <p className="install-note">
              Este navegador não registrou o service worker do app, então não há o que atualizar
              por aqui — a página já carrega sempre a versão mais recente do servidor. Instale o
              app (Configurações → Instalar app) para ter a atualização controlada por esta tela.
            </p>
          </>
        )}
      </main>

      {canCheck && (
        <ActionBar>
          <button className="btn primary" onClick={() => void onCheck()} disabled={checking}>
            <Icon name="refresh" /> {checking ? 'Procurando…' : 'Procurar atualização'}
          </button>
        </ActionBar>
      )}
    </>
  )
}
