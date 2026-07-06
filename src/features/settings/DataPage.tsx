import { useRef, useState } from 'react'
import { db } from '../../db/db'
import {
  exportBackup,
  exportExercisesShare,
  generateExample,
  importBackupReplaceAll,
  importExercisesMerge,
  parseBackup,
  parseShare,
  PortabilityError,
} from '../../data/portability'
import { useActiveGym } from '../../state/activeGym'
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

  const onExportShare = async () => {
    download(`myonegym-exercicios-${stamp()}.json`, await exportExercisesShare(db))
    toast('Exercícios exportados.')
  }

  const onImportFile = async (file: File) => {
    const text = await file.text()
    // Peek the kind to route: full backup (replace all) vs shared exercises (merge)
    let kind: 'backup' | 'exercises'
    try {
      const peek = JSON.parse(text)
      kind = peek?.kind
      if (kind !== 'backup' && kind !== 'exercises') throw new Error()
    } catch {
      toast('Arquivo inválido do MyOneGym.')
      return
    }

    try {
      if (kind === 'backup') {
        const doc = parseBackup(text) // validates before touching the store
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
      } else {
        const doc = parseShare(text)
        const added = await importExercisesMerge(doc, db)
        toast(`${added} exercício(s) importado(s).`)
      }
    } catch (e) {
      toast(e instanceof PortabilityError ? e.message : 'Falha ao importar.')
    }
  }

  return (
    <>
      <BackBar title="Backup e compartilhamento" to="/settings" />
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
          <button className="row" onClick={onExportShare}>
            <span className="row-ic">
              <Icon name="share-2" />
            </span>
            <span className="row-body">
              <span className="row-title">Exportar exercícios (JSON)</span>
              <span className="row-sub">Exercícios + categorias, para compartilhar</span>
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
              <span className="row-title">Importar (JSON)</span>
              <span className="row-sub warn">Backup substitui todos os dados; lista de exercícios é adicionada</span>
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
      </main>
    </>
  )
}
