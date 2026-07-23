import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../App'
import { db } from '../../db/db'
import {
  addPhoto,
  completeSession,
  createCategory,
  createDay,
  createExercise,
  createGym,
  listSessionEntries,
  saveNote,
  saveWeight,
  setEntryDone,
  startSession,
} from '../../db/repos'
import { useActiveGym } from '../../state/activeGym'
import { useOnboarding } from '../../state/onboarding'

/** Capture whatever `download()` writes, without a real DOM download. */
function captureDownload(): { text: () => Promise<string> } {
  let blob: Blob | null = null
  Object.defineProperty(URL, 'createObjectURL', {
    value: (b: Blob) => {
      blob = b
      return 'blob:fake'
    },
    configurable: true,
  })
  Object.defineProperty(URL, 'revokeObjectURL', { value: () => {}, configurable: true })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  return { text: () => blob!.text() }
}

beforeEach(() => {
  localStorage.clear()
  useOnboarding.getState().markPromptSeen()
})
afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  await Promise.all(
    [
      db.gyms,
      db.categories,
      db.exercises,
      db.days,
      db.weights,
      db.weightHistory,
      db.sessions,
      db.sessionEntries,
      db.exerciseNotes,
      db.exercisePhotos,
    ].map((t) => t.clear()),
  )
  useActiveGym.setState({ activeGymId: null })
})

async function seedEverything() {
  const gym = await createGym('Academia A', undefined, db)
  useActiveGym.setState({ activeGymId: gym })
  const cat = await createCategory('Peito', db)
  const ex = await createExercise({ name: 'Supino', categoryId: cat }, db)
  const day = await createDay({ name: 'Dia 1', exerciseIds: [ex] }, db)
  await saveWeight(gym, ex, 42.5, 'KG', db)
  await saveNote(gym, ex, 'cotovelo fixo', db)
  await addPhoto(gym, ex, new Uint8Array([1, 2, 3, 250, 255]).buffer as ArrayBuffer, 'image/jpeg', 100, 80, db)
  const sid = await startSession(gym, day, db)
  await setEntryDone((await listSessionEntries(sid, db))[0].id!, true, db)
  await completeSession(sid, db)
}

function renderData() {
  return render(
    <MemoryRouter initialEntries={['/settings/data']}>
      <App />
    </MemoryRouter>,
  )
}

describe('Full backup → restore through the Data screen', () => {
  it('exports everything and restores it after a wipe', async () => {
    await seedEverything()
    const dl = captureDownload()
    const user = userEvent.setup()
    renderData()

    await user.click(await screen.findByText('Exportar backup (JSON)'))
    await waitFor(() => expect(screen.getByText('Backup exportado.')).toBeInTheDocument())
    const json = await dl.text()

    // The backup really carries the "device-local" tables now.
    expect(json).toContain('exercisePhotos')
    expect(json).toContain('sessions')
    expect(json).toContain('changedAt') // weight history

    // Wipe the device, then import the produced file.
    await Promise.all(
      [
        db.gyms,
        db.categories,
        db.exercises,
        db.days,
        db.weights,
        db.weightHistory,
        db.sessions,
        db.sessionEntries,
        db.exerciseNotes,
        db.exercisePhotos,
      ].map((t) => t.clear()),
    )
    expect(await db.gyms.count()).toBe(0)

    const file = new File([json], 'myonegym-backup.json', { type: 'application/json' })
    await user.upload(
      document.querySelector('input[type="file"]') as HTMLInputElement,
      file,
    )
    // Confirm the destructive restore.
    await user.click(await screen.findByRole('button', { name: 'Substituir tudo' }))
    await waitFor(() => expect(screen.getByText('Backup importado.')).toBeInTheDocument())

    // Everything is back.
    expect(await db.gyms.count()).toBe(1)
    expect(await db.weightHistory.count()).toBeGreaterThan(0)
    expect(await db.sessions.count()).toBe(1)
    expect((await db.exerciseNotes.toArray())[0].text).toBe('cotovelo fixo')
    const [photo] = await db.exercisePhotos.toArray()
    expect([...new Uint8Array(photo.bytes)]).toEqual([1, 2, 3, 250, 255])
  })

  it('declining the restore confirmation leaves data untouched', async () => {
    await seedEverything()
    const dl = captureDownload()
    const user = userEvent.setup()
    renderData()

    await user.click(await screen.findByText('Exportar backup (JSON)'))
    await waitFor(() => expect(screen.getByText('Backup exportado.')).toBeInTheDocument())
    const json = await dl.text()

    await createGym('Academia B', undefined, db) // a change we must NOT lose on decline
    const file = new File([json], 'b.json', { type: 'application/json' })
    await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file)
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }))

    expect(await db.gyms.count()).toBe(2) // nothing replaced
  })
})
