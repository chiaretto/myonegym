import { useRef, useState } from 'react'
import { db } from '../../db/db'
import {
  exportBackup,
  generateExample,
  importBackupReplaceAll,
  parseBackup,
  PortabilityError,
  resetAll,
} from '../../data/portability'
import { useActiveGym } from '../../state/activeGym'
import { useOnboarding } from '../../state/onboarding'
import { BackBar } from '../../ui/Chrome'
import { useConfirm, useToast } from '../../ui/Feedback'
import { Icon } from '../../ui/Icon'

function download(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
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
    download(`myonegym-backup-${stamp()}.json`, await exportBackup(db))
    toast('Backup exportado.')
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
        'Isto apaga TODOS os dados cadastrados deste dispositivo — academias, categorias, exercícios, dias, pesos, histórico e treinos. Não pode ser desfeito.',
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
          <button className="row" onClick={onExportBackup}>
            <span className="row-ic">
              <Icon name="download" />
            </span>
            <span className="row-body">
              <span className="row-title">Exportar backup (JSON)</span>
              <span className="row-sub">Tudo, exceto o histórico de peso</span>
            </span>
          </button>
        </div>

        <div className="group-label">Importar</div>
        <div className="group">
          <button className="row" onClick={() => fileRef.current?.click()}>
            <span className="row-ic solid">
              <Icon name="upload" />
            </span>
            <span className="row-body">
              <span className="row-title">Importar backup (JSON)</span>
              <span className="row-sub warn">Substitui TODOS os dados deste dispositivo</span>
            </span>
          </button>
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
