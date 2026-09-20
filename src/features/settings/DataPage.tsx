import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../../db/db'
import {
  exportBackup,
  generateExample,
  importBackupReplaceAll,
  parseBackup,
  PortabilityError,
  resetAll,
} from '../../data/portability'
import { backupToDrive, restoreFromDrive, useSignInReturn } from '../../lib/cloudBackup'
import { DriveError } from '../../lib/driveBackup'
import { fmtDateTime } from '../../lib/format'
import { beginSignIn, isConfigured } from '../../lib/googleAuth'
import { useOnline } from '../../lib/online'
import { useActiveGym } from '../../state/activeGym'
import { useGoogleAccount } from '../../state/googleAccount'
import { useOnboarding } from '../../state/onboarding'
import { BackBar } from '../../ui/Chrome'
import { useConfirm, useToast } from '../../ui/Feedback'
import { Icon } from '../../ui/Icon'
import './account.css'

function download(filename: string, data: unknown) {
  // Compact, not pretty-printed: a full backup embeds photos as base64 and can be
  // several MB — indentation would add megabytes of pure whitespace.
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function stamp() {
  return new Date().toISOString().slice(0, 10)
}

export function DataPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const reconcile = useActiveGym((s) => s.reconcile)
  const resetPromptSeen = useOnboarding((s) => s.resetPromptSeen)
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const online = useOnline()
  const profile = useGoogleAccount((s) => s.profile)
  const driveGranted = useGoogleAccount((s) => s.driveGranted)
  const lastBackupAt = useGoogleAccount((s) => s.lastBackupAt)
  const lastRestoreAt = useGoogleAccount((s) => s.lastRestoreAt)

  /** Drive failures arrive already phrased; anything else gets a generic line. */
  const driveFailure = (e: unknown, fallback: string) =>
    toast(e instanceof DriveError || e instanceof PortabilityError ? e.message : fallback)

  const onDriveBackup = async () => {
    setBusy(true)
    try {
      const r = await backupToDrive({ confirm, returnTo: '/settings/data', db })
      // 'redirected' means the page is leaving for Google; 'cancelled' needs no
      // toast — the user just said no.
      if (r.kind === 'done') {
        toast(
          r.missingPhotos > 0
            ? `Backup enviado ao Drive — ${r.missingPhotos} foto(s) sem imagem ficaram de fora.`
            : 'Backup enviado ao Drive.',
        )
      }
    } catch (e) {
      driveFailure(e, 'Falha ao enviar o backup.')
    } finally {
      setBusy(false)
    }
  }

  const onDriveRestore = async () => {
    setBusy(true)
    try {
      const r = await restoreFromDrive({ confirm, returnTo: '/settings/data', db })
      if (r.kind === 'done') {
        await reconcile()
        toast('Backup restaurado do Drive.')
      } else if (r.kind === 'none') {
        toast('Nenhum backup na nuvem para esta conta.')
      }
    } catch (e) {
      driveFailure(e, 'Falha ao restaurar.')
    } finally {
      setBusy(false)
    }
  }

  // Coming back from Google: finish the sign-in and pick up what the user was
  // doing. A restore still goes through its confirmation inside the action.
  useSignInReturn({
    backup: () => void onDriveBackup(),
    restore: () => void onDriveRestore(),
    connected: () => toast('Conta Google conectada.'),
    failed: (message) => toast(message),
  })

  const connect = () => beginSignIn('connect', '/settings/data')

  const onExample = async () => {
    setBusy(true)
    try {
      await generateExample(db)
      await reconcile()
      toast('Exemplo gerado.')
    } finally {
      setBusy(false)
    }
  }

  const onExportBackup = async () => {
    setBusy(true)
    try {
      // A full backup with photos can take a moment to build and serialize.
      const doc = await exportBackup(db)
      download(`myonegym-backup-${stamp()}.json`, doc)
      // A photo whose image file is missing is skipped rather than aborting the
      // export — but silently dropping it would let the user believe the backup
      // is complete when it isn't.
      const missing = (await db.exercisePhotos.count()) - doc.exercisePhotos.length
      toast(
        missing > 0
          ? `Backup exportado — ${missing} foto(s) sem imagem ficaram de fora.`
          : 'Backup exportado.',
      )
    } finally {
      setBusy(false)
    }
  }

  const onImportFile = async (file: File) => {
    const text = await file.text()
    try {
      const doc = parseBackup(text) // validates (rejects non-backups) before touching the store
      const ok = await confirm({
        title: 'Importar backup?',
        message: 'Isto substitui TODOS os dados atuais deste dispositivo. Não pode ser desfeito.',
        confirmLabel: 'Substituir tudo',
        danger: true,
      })
      if (!ok) return
      await importBackupReplaceAll(doc, db)
      await reconcile()
      toast('Backup importado.')
    } catch (e) {
      toast(e instanceof PortabilityError ? e.message : 'Falha ao importar.')
    }
  }

  const onReset = async () => {
    const ok = await confirm({
      title: 'Resetar app?',
      message:
        'Isto apaga TODOS os dados cadastrados deste dispositivo — academias, categorias, exercícios, dias, pesos, histórico, treinos e fotos. Não pode ser desfeito.',
      confirmLabel: 'Apagar tudo',
      danger: true,
    })
    if (!ok) return
    setBusy(true)
    try {
      await resetAll(db)
      await reconcile()
      resetPromptSeen() // re-arm the first-launch sample-data prompt
      toast('App resetado.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <BackBar title="Backup" to="/settings" />
      <main className="screen">
        <div className="group-label">Começar rápido</div>
        <div className="group">
          <button className="row" onClick={onExample} disabled={busy}>
            <span className="row-ic">
              <Icon name="wand" />
            </span>
            <span className="row-body">
              <span className="row-title">Gerar exemplo</span>
              <span className="row-sub">Categorias, exercícios e dias de demonstração</span>
            </span>
          </button>
        </div>

        <div className="group-label">Exportar</div>
        <div className="group">
          <button className="row" onClick={onExportBackup} disabled={busy}>
            <span className="row-ic">
              <Icon name="download" />
            </span>
            <span className="row-body">
              <span className="row-title">Exportar backup (JSON)</span>
              <span className="row-sub">
                Backup completo: pesos, notas, treinos, histórico e fotos
              </span>
            </span>
          </button>
          {/* The backup is now a full snapshot — worth saying it can be large so a
              slow export/download on a phone isn't a surprise. */}
          <p className="group-note">
            <Icon name="database" size={12} /> Inclui <strong>tudo</strong> deste aparelho. Com muitas
            fotos o arquivo pode ficar grande.
          </p>
        </div>

        <div className="group-label">Importar</div>
        <div className="group">
          <button className="row" onClick={() => fileRef.current?.click()}>
            <span className="row-ic solid">
              <Icon name="upload" />
            </span>
            <span className="row-body">
              <span className="row-title">Importar backup (JSON)</span>
              <span className="row-sub warn">
                Substitui TODOS os dados deste dispositivo, inclusive as fotos
              </span>
            </span>
          </button>
          {/* Two things a restore can no longer bring back, said before it runs
              rather than discovered after: the app's own catalog is code now, and
              the warm-ups do not exist any more. */}
          <p className="group-note">
            <Icon name="info-circle" size={12} /> De um arquivo antigo, a lista de exercícios e
            categorias <strong>oficiais</strong> não é restaurada — ela vem com o app. Os
            <strong> aquecimentos</strong> também não: eles deixaram de existir, e os vídeos do
            exercício ocupam esse lugar.
          </p>
        </div>

        {/* The account is optional and lives only here: nothing else in the app
            asks the user to sign in. Disconnected, this is one row that says
            so; connected, the two actions and the dates this device recorded
            for them — shown without a single request. */}
        <div className="group-label">Google Drive</div>
        <div className="group">
          {!isConfigured() ? (
            <p className="group-note">
              <Icon name="cloud-off" size={12} /> Conta Google <strong>não configurada</strong> neste
              build. O backup por arquivo continua disponível.
            </p>
          ) : !profile ? (
            <button className="row" onClick={connect} disabled={busy}>
              <span className="row-ic">
                <Icon name="brand-google" />
              </span>
              <span className="row-body">
                <span className="row-title">Conectar conta Google</span>
                <span className="row-sub">Opcional · guarda o backup no seu Google Drive</span>
              </span>
            </button>
          ) : (
            <>
              <Link className="row" to="/settings/account">
                <span className="row-ic">
                  {profile.picture ? (
                    <img className="avatar" src={profile.picture} alt="" referrerPolicy="no-referrer" />
                  ) : (
                    <Icon name="user-circle" />
                  )}
                </span>
                <span className="row-body">
                  <span className="row-title">{profile.name}</span>
                  <span className="row-sub">{profile.email}</span>
                </span>
                <Icon name="chevron-right" className="chev" />
              </Link>
              {!driveGranted ? (
                <button className="row" onClick={connect} disabled={busy}>
                  <span className="row-ic">
                    <Icon name="brand-google" />
                  </span>
                  <span className="row-body">
                    <span className="row-title">Conceder acesso ao Drive</span>
                    <span className="row-sub warn">
                      O acesso ao Google Drive não foi concedido. Entre de novo e marque-o
                    </span>
                  </span>
                </button>
              ) : (
                <>
                  <button className="row" onClick={() => void onDriveBackup()} disabled={busy || !online}>
                    <span className="row-ic">
                      <Icon name="cloud-upload" />
                    </span>
                    <span className="row-body">
                      <span className="row-title">Fazer backup no Drive</span>
                      <span className="row-sub">
                        {online
                          ? `Último backup: ${lastBackupAt ? fmtDateTime(lastBackupAt) : 'Nunca'}`
                          : 'Precisa de conexão'}
                      </span>
                    </span>
                  </button>
                  <button className="row" onClick={() => void onDriveRestore()} disabled={busy || !online}>
                    <span className="row-ic solid">
                      <Icon name="cloud-download" />
                    </span>
                    <span className="row-body">
                      <span className="row-title">Restaurar do Drive</span>
                      <span className="row-sub warn">
                        {online
                          ? `Última restauração: ${lastRestoreAt ? fmtDateTime(lastRestoreAt) : 'Nunca'} · substitui todos os dados`
                          : 'Precisa de conexão'}
                      </span>
                    </span>
                  </button>
                </>
              )}
            </>
          )}
          <p className="group-note">
            <Icon name="cloud" size={12} /> Uma cópia numa pasta <strong>oculta</strong> do seu Google
            Drive, que só este app vê. Nada sobe nem desce sozinho — só quando você toca.
          </p>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = '' // allow re-selecting the same file
            if (f) void onImportFile(f)
          }}
        />

        <div className="group-label">Zona de perigo</div>
        <div className="group">
          <button className="row" onClick={() => void onReset()} disabled={busy}>
            <span className="row-ic danger">
              <Icon name="alert-triangle" />
            </span>
            <span className="row-body">
              <span className="row-title">Resetar app</span>
              <span className="row-sub danger">Apaga todos os dados deste dispositivo. Não pode ser desfeito</span>
            </span>
          </button>
        </div>
      </main>
    </>
  )
}
