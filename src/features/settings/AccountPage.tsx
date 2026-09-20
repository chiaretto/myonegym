import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { disconnectAccount } from '../../lib/cloudBackup'
import { fmtDateTime } from '../../lib/format'
import { useGoogleAccount } from '../../state/googleAccount'
import { BackBar } from '../../ui/Chrome'
import { useConfirm, useToast } from '../../ui/Feedback'
import { Icon } from '../../ui/Icon'
import './install.css'
import './account.css'

/**
 * The connected Google account: who it is, what the app does with it, and the
 * way out. Reached only from the Drive group of the Backup screen — the account
 * is optional, and this screen has nothing to show without one, so it sends a
 * visitor without an account straight back.
 */
export function AccountPage() {
  const profile = useGoogleAccount((s) => s.profile)
  const driveGranted = useGoogleAccount((s) => s.driveGranted)
  const lastBackupAt = useGoogleAccount((s) => s.lastBackupAt)
  const lastRestoreAt = useGoogleAccount((s) => s.lastRestoreAt)
  const nav = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!profile) nav('/settings/data', { replace: true })
  }, [profile, nav])

  if (!profile) return null

  const onSignOut = async () => {
    const ok = await confirm({
      title: 'Sair da conta Google?',
      message:
        'Este aparelho deixa de ter a conta conectada. O backup na nuvem e os dados daqui continuam como estão.',
      confirmLabel: 'Sair',
    })
    if (!ok) return
    setBusy(true)
    try {
      await disconnectAccount()
      toast('Conta desconectada.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <BackBar title="Conta Google" to="/settings/data" />
      <main className="screen">
        <div className="install-hero account-hero">
          <span className="avatar-wrap">
            {profile.picture ? (
              // referrerPolicy: Google's avatar host refuses requests that
              // carry a referrer from an unknown origin.
              <img className="avatar" src={profile.picture} alt="" referrerPolicy="no-referrer" />
            ) : (
              <Icon name="user-circle" />
            )}
          </span>
          <span className="account-name">{profile.name}</span>
          <span className="account-email">{profile.email}</span>
        </div>

        <div className="group-label">Backup no Drive</div>
        <div className="group">
          <div className="row">
            <span className="row-ic">
              <Icon name="cloud-upload" />
            </span>
            <span className="row-body">
              <span className="row-title">Último backup deste aparelho</span>
              <span className="row-sub">{lastBackupAt ? fmtDateTime(lastBackupAt) : 'Nunca'}</span>
            </span>
          </div>
          <div className="row">
            <span className="row-ic">
              <Icon name="cloud-download" />
            </span>
            <span className="row-body">
              <span className="row-title">Última restauração neste aparelho</span>
              <span className="row-sub">{lastRestoreAt ? fmtDateTime(lastRestoreAt) : 'Nunca'}</span>
            </span>
          </div>
          {!driveGranted && (
            <p className="group-note">
              <Icon name="alert-triangle" size={12} /> O acesso ao Google Drive{' '}
              <strong>não foi concedido</strong> a esta conta. Conceda-o pela tela de Backup para
              fazer backup e restaurar.
            </p>
          )}
        </div>

        <div className="group-label">O que é compartilhado</div>
        <div className="group">
          <p className="group-note">
            <Icon name="lock" size={12} /> Só o <strong>backup</strong> — o mesmo arquivo de
            "Exportar backup" — e só quando você toca em fazer backup. Ele vai para uma pasta{' '}
            <strong>oculta</strong> do seu Google Drive, que a interface do Drive não mostra e que só
            este app enxerga. Nada sobe nem desce sozinho.
          </p>
          <p className="group-note">
            <Icon name="info-circle" size={12} /> Para remover o acesso do app, use a sua Conta Google
            (Segurança → Conexões com apps de terceiros). Isso também apaga a pasta oculta, backup
            incluído.
          </p>
        </div>

        <div className="group-label">Sair</div>
        <div className="group">
          <button className="row" onClick={() => void onSignOut()} disabled={busy}>
            <span className="row-ic">
              <Icon name="logout" />
            </span>
            <span className="row-body">
              <span className="row-title">Sair da conta Google</span>
              <span className="row-sub">
                Esquece a conta neste aparelho. Não apaga o backup na nuvem nem os dados daqui
              </span>
            </span>
          </button>
        </div>
      </main>
    </>
  )
}
