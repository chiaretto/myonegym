import { useEffect, useMemo, useRef, useState } from 'react'
import { db } from '../../../db/db'
import { addPhoto, deletePhoto } from '../../../db/repos'
import type { ExercisePhoto } from '../../../db/types'
import { usePhotos } from '../../../lib/hooks'
import { useConfirm, useToast } from '../../../ui/Feedback'
import { Icon } from '../../../ui/Icon'
import { Sheet } from '../../../ui/Sheet'
import { PhotoError, downscalePhoto } from './downscale'

/**
 * Object URL for a stored photo, revoked on unmount / id change.
 *
 * Creating the URL inline during render would leak one per render — a long
 * session would pin every photo it ever showed in memory.
 */
function usePhotoUrl(photo: ExercisePhoto): string {
  const [url, setUrl] = useState('')
  // The bytes are immutable once stored, so the record id identifies them.
  const key = photo.id
  useEffect(() => {
    const next = URL.createObjectURL(new Blob([photo.bytes], { type: photo.type }))
    setUrl(next)
    return () => URL.revokeObjectURL(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return url
}

function Thumb({ photo, onOpen }: { photo: ExercisePhoto; onOpen: () => void }) {
  const url = usePhotoUrl(photo)
  return (
    <button className="photo-thumb" onClick={onOpen} aria-label="Ver foto">
      {url && <img src={url} alt="" loading="lazy" />}
    </button>
  )
}

function Viewer({
  photo,
  onClose,
  onDelete,
}: {
  photo: ExercisePhoto
  onClose: () => void
  onDelete: () => void
}) {
  const url = usePhotoUrl(photo)
  return (
    <Sheet title="Foto" onClose={onClose}>
      <div className="photo-viewer">{url && <img src={url} alt="Foto do exercício" />}</div>
      <div className="sheet-actions">
        <button className="btn danger" onClick={onDelete}>
          <Icon name="trash" /> Excluir
        </button>
      </div>
    </Sheet>
  )
}

/**
 * The Foto tab: per-gym photos of an exercise (the machine's setup in *this*
 * gym), mirroring `NoteEditor`'s shape — same `(gymId, exerciseId)` key, same
 * empty states — but many photos per pair instead of one note.
 */
export function PhotoTab({ gymId, exerciseId }: { gymId: number | null; exerciseId: number | null }) {
  const photos = usePhotos(gymId, exerciseId)
  const toast = useToast()
  const confirm = useConfirm()
  const [busy, setBusy] = useState(false)
  const [openId, setOpenId] = useState<number | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const open = useMemo(() => photos.find((p) => p.id === openId), [photos, openId])

  if (gymId == null) {
    return (
      <section className="note-card">
        <p className="note-empty">
          Crie ou selecione uma academia para anexar uma foto deste exercício.
        </p>
      </section>
    )
  }
  if (exerciseId == null) {
    return (
      <section className="note-card">
        <p className="note-empty">Exercício indisponível — não é possível anexar uma foto.</p>
      </section>
    )
  }

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Reset so picking the same file twice in a row still fires onChange.
    e.target.value = ''
    if (!file) return

    setBusy(true)
    try {
      const { bytes, type, width, height } = await downscalePhoto(file)
      await addPhoto(gymId, exerciseId, bytes, type, width, height, db)
      toast('Foto anexada.')
    } catch (err) {
      // A photo that looks attached but was never stored must not be possible —
      // the most likely cause here is an exhausted storage quota.
      if (err instanceof PhotoError) toast(err.message)
      else if (err instanceof Error && err.name === 'QuotaExceededError') {
        toast('Armazenamento cheio — não foi possível salvar a foto.')
      } else toast('Não foi possível salvar a foto.')
    } finally {
      setBusy(false)
    }
  }

  const onDelete = async (id: number) => {
    const ok = await confirm({
      title: 'Excluir foto?',
      message: 'A foto será removida deste exercício nesta academia.',
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (!ok) return
    await deletePhoto(id, db)
    setOpenId(null)
    toast('Foto excluída.')
  }

  return (
    <section className="note-card">
      {photos.length === 0 ? (
        <p className="note-empty">
          Nenhuma foto ainda. Fotografe o aparelho para lembrar a regulagem nesta academia.
        </p>
      ) : (
        <ul className="photo-grid">
          {photos.map((p) => (
            <li key={p.id}>
              <Thumb photo={p} onOpen={() => setOpenId(p.id!)} />
            </li>
          ))}
        </ul>
      )}

      <div className="photo-actions">
        <button className="btn" onClick={() => cameraRef.current?.click()} disabled={busy}>
          <Icon name="camera" /> {busy ? 'Processando…' : 'Tirar foto'}
        </button>
        <button className="btn" onClick={() => galleryRef.current?.click()} disabled={busy}>
          <Icon name="photo" /> Escolher da galeria
        </button>
      </div>

      {/* Two inputs: `capture` asks for the camera, its absence for the picker. */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onPick}
        data-testid="photo-camera-input"
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onPick}
        data-testid="photo-gallery-input"
      />

      {open && (
        <Viewer photo={open} onClose={() => setOpenId(null)} onDelete={() => onDelete(open.id!)} />
      )}
    </section>
  )
}
