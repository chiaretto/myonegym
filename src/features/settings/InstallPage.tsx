import { useState } from 'react'
import { useInstall } from '../../lib/install'
import { ActionBar } from '../../ui/ActionBar'
import { BackBar } from '../../ui/Chrome'
import { useToast } from '../../ui/Feedback'
import { Icon } from '../../ui/Icon'
import './install.css'

/** The installed icon itself, so the page shows what lands on the home screen.
 *  Lives in public/, hence BASE_URL rather than a bundled import. */
const appIcon = `${import.meta.env.BASE_URL}pwa-192x192.png`

export function InstallPage() {
  const canInstall = useInstall((s) => s.canInstall)
  const isInstalled = useInstall((s) => s.isInstalled)
  const platform = useInstall((s) => s.platform)
  const promptInstall = useInstall((s) => s.promptInstall)
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const onInstall = async () => {
    setBusy(true)
    try {
      const outcome = await promptInstall()
      if (outcome === 'accepted') toast('App instalado.')
      else if (outcome === 'dismissed') toast('Instalação cancelada.')
      else toast('A instalação não está disponível agora.')
    } finally {
      setBusy(false)
    }
  }

  // Order matters: an installed app must never be offered the install dialog,
  // and iOS never reaches the `canInstall` branch because Safari has no
  // beforeinstallprompt at all.
  const state = isInstalled
    ? 'installed'
    : canInstall
      ? 'prompt'
      : platform === 'ios'
        ? 'ios'
        : 'manual'

  return (
    <>
      <BackBar title="Instalar app" to="/settings" />
      <main className={`screen${state === 'prompt' ? ' has-action-bar' : ''}`}>
        <div className="install-hero">
          <img src={appIcon} alt="" />
          {/* Same split lockup as the Home app bar (.wordmark em paints "One"
              red). aria-label pins the spelling: name-from-content would
              otherwise announce "My One Gym". */}
          <span className="wordmark" aria-label="MyOneGym">
            My<em>One</em>Gym
          </span>
          <p>
            Instale na tela inicial para abrir em tela cheia, sem a barra do navegador, e usar
            offline. Seus dados continuam apenas neste aparelho.
          </p>
        </div>

        {state === 'installed' && (
          <>
            <div className="group-label">Status</div>
            <div className="group">
              <div className="row">
                <span className="row-ic">
                  <Icon name="circle-check" />
                </span>
                <span className="row-body">
                  <span className="row-title">App instalado</span>
                  <span className="row-sub">
                    Abra pelo ícone na tela inicial para usar em tela cheia.
                  </span>
                </span>
              </div>
            </div>
          </>
        )}

        {state === 'prompt' && (
          <>
            <div className="group-label">Instalação</div>
            <div className="group">
              <div className="row">
                <span className="row-ic">
                  <Icon name="device-mobile" />
                </span>
                <span className="row-body">
                  <span className="row-title">Pronto para instalar</span>
                  <span className="row-sub">
                    Seu navegador pode instalar o MyOneGym neste aparelho agora.
                  </span>
                </span>
              </div>
            </div>
          </>
        )}

        {state === 'ios' && (
          <>
            <div className="group-label">Como instalar no iPhone ou iPad</div>
            <ol className="group steps">
              <li>
                Toque em <Icon name="share-2" /> <strong>Compartilhar</strong>, na barra do
                navegador.
              </li>
              <li>
                Role a lista e escolha <Icon name="square-rounded-plus" />{' '}
                <strong>Adicionar à Tela de Início</strong>.
              </li>
              <li>
                Confirme em <strong>Adicionar</strong>. O ícone do MyOneGym aparece na tela
                inicial.
              </li>
            </ol>
            <p className="install-note">
              O iPhone e o iPad não permitem que um site instale a si mesmo, por isso não há um
              botão aqui. No Safari este caminho está sempre disponível; em outros navegadores ele
              existe apenas nas versões mais recentes do iOS.
            </p>
          </>
        )}

        {state === 'manual' && (
          <>
            <div className="group-label">Instalação</div>
            <p className="install-note">
              {platform === 'android'
                ? 'Este navegador ainda não ofereceu a instalação. Abra o menu do navegador e procure "Instalar app" ou "Adicionar à tela inicial" — ou recarregue a página e volte aqui.'
                : 'Este navegador não oferece instalação. Use o Chrome no Android, ou o Safari no iPhone e no iPad, para instalar o MyOneGym.'}
            </p>
          </>
        )}
      </main>

      {state === 'prompt' && (
        <ActionBar>
          <button className="btn primary" onClick={() => void onInstall()} disabled={busy}>
            <Icon name="download" /> Instalar app
          </button>
        </ActionBar>
      )}
    </>
  )
}
