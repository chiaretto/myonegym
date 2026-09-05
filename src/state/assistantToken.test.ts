import { beforeEach, describe, expect, it } from 'vitest'
import { MyOneGymDB } from '../db/db'
import { createCategory, createExercise } from '../db/repos'
import { exportBackup, resetAll } from '../data/portability'
import { hasAssistantToken, useAssistantToken } from './assistantToken'

const SECRET = 'AIzaSyChaveDeTeste000000000000000000000'

beforeEach(() => {
  localStorage.clear()
  useAssistantToken.getState().clear()
})

describe('assistant key store', () => {
  it('saves and clears the key', () => {
    expect(hasAssistantToken()).toBe(false)

    useAssistantToken.getState().setToken(SECRET)
    expect(useAssistantToken.getState().token).toBe(SECRET)
    expect(hasAssistantToken()).toBe(true)

    useAssistantToken.getState().clear()
    expect(hasAssistantToken()).toBe(false)
  })

  it('trims whitespace around a pasted key', () => {
    useAssistantToken.getState().setToken(`  ${SECRET}\n`)
    expect(useAssistantToken.getState().token).toBe(SECRET)
  })

  it('keeps its own storage key, separate from the app settings', () => {
    useAssistantToken.getState().setToken(SECRET)
    expect(localStorage.getItem('myonegym.assistantKey')).toContain(SECRET)
    expect(localStorage.getItem('myonegym.settings') ?? '').not.toContain(SECRET)
  })
})

describe('the key is a device preference, not user data', () => {
  it('is not part of the exported backup', async () => {
    const d = new MyOneGymDB(`test-token-export-${Date.now()}`)
    await d.open()
    await createCategory('Peitoral', d)
    useAssistantToken.getState().setToken(SECRET)

    const backup = await exportBackup(d)

    expect(JSON.stringify(backup)).not.toContain(SECRET)
    await d.delete()
  })

  it('survives "Resetar app", like the font-size preference does', async () => {
    const d = new MyOneGymDB(`test-token-reset-${Date.now()}`)
    await d.open()
    await createExercise({ name: 'Rosca' }, d)
    useAssistantToken.getState().setToken(SECRET)

    await resetAll(d)

    expect(await d.exercises.count()).toBe(0)
    expect(useAssistantToken.getState().token).toBe(SECRET)
    await d.delete()
  })
})
