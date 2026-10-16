// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useUnsavedChangesStore } from './unsavedChanges'

const state = vi.hoisted(() => ({
  dirty: false,
  showingSolution: false,
  currentGuide: undefined as { validation?: unknown } | undefined,
  saveSnapshot: vi.fn(async () => {}),
  markSaved: vi.fn(),
}))

describe('unsaved changes store', () => {
  beforeEach(() => {
    state.dirty = false
    state.showingSolution = false
    state.currentGuide = undefined
    state.saveSnapshot.mockReset()
    state.markSaved.mockReset()
    // The store resolves these from Nuxt auto-imports at setup time.
    vi.stubGlobal('usePlaygroundStore', () => ({ isDirty: state.dirty, markSaved: state.markSaved }))
    vi.stubGlobal('useGuideStore', () => ({
      showingSolution: state.showingSolution,
      currentGuide: state.currentGuide,
    }))
    vi.stubGlobal('useFileManagerStore', () => ({ saveSnapshot: state.saveSnapshot }))
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('proceeds immediately when there is nothing unsaved', async () => {
    const store = useUnsavedChangesStore()
    await expect(store.confirmOrDiscard('anything')).resolves.toBe(true)
    expect(store.isOpen).toBe(false)
    expect(state.saveSnapshot).not.toHaveBeenCalled()
  })

  it('cancels the pending action when the user keeps editing', async () => {
    state.dirty = true
    const store = useUnsavedChangesStore()
    const pending = store.confirmOrDiscard('anything')
    expect(store.isOpen).toBe(true)
    store.choose('cancel')
    await expect(pending).resolves.toBe(false)
    expect(store.isOpen).toBe(false)
    expect(state.saveSnapshot).not.toHaveBeenCalled()
  })

  it('saves a snapshot before proceeding when the user saves and leaves', async () => {
    state.dirty = true
    const store = useUnsavedChangesStore()
    const pending = store.confirmOrDiscard('Saved before leaving the lesson')
    store.choose('save')
    await expect(pending).resolves.toBe(true)
    expect(state.saveSnapshot).toHaveBeenCalledWith({
      type: 'manual',
      message: 'Saved before leaving the lesson',
    })
  })

  it('proceeds without saving when the user discards', async () => {
    state.dirty = true
    const store = useUnsavedChangesStore()
    const pending = store.confirmOrDiscard('anything')
    store.choose('leave')
    await expect(pending).resolves.toBe(true)
    expect(state.saveSnapshot).not.toHaveBeenCalled()
    // Discarding stops tracking the current contents as "unsaved".
    expect(state.markSaved).toHaveBeenCalledTimes(1)
  })

  it('does not guard while a challenge solution peek is showing', async () => {
    state.dirty = true
    state.showingSolution = true
    state.currentGuide = { validation: {} }
    const store = useUnsavedChangesStore()
    await expect(store.confirmOrDiscard('anything')).resolves.toBe(true)
    expect(store.isOpen).toBe(false)
  })

  it('still guards while a plain lesson shows its solution', async () => {
    state.dirty = true
    state.showingSolution = true
    state.currentGuide = {}
    const store = useUnsavedChangesStore()
    const pending = store.confirmOrDiscard('anything')
    expect(store.isOpen).toBe(true)
    store.choose('cancel')
    await expect(pending).resolves.toBe(false)
  })
})
