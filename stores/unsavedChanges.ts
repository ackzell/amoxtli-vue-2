import { acceptHMRUpdate, defineStore } from 'pinia'
import { ref } from 'vue'
import { unsavedDebug } from '~/composables/useUnsavedDebug'

export type UnsavedChangeChoice = 'save' | 'leave' | 'cancel'

/**
 * Coordinates the "unsaved playground changes" confirmation dialog.
 *
 * The dialog is intentionally store-driven (rather than a local component
 * state) because two very different callers need to await the same choice:
 * the route guards in `pages/[...slug].vue` (navigation) and the destructive
 * lesson buttons (retake / show solution).
 */
export const useUnsavedChangesStore = defineStore('unsavedChanges', () => {
  const playground = usePlaygroundStore()
  const guide = useGuideStore()
  const fm = useFileManagerStore()

  const isOpen = ref(false)
  let resolver: ((choice: UnsavedChangeChoice) => void) | null = null

  /**
   * True when continuing the pending action would discard user edits.
   *
   * A challenge lesson's "Show solution" is a non-destructive *peek*: while it
   * is open the editor shows the reference solution, so `isDirty` (live files
   * vs. the user's own save point) is not meaningful and we stand down. Plain
   * lessons swap the editor contents for real, so their `showingSolution` state
   * is still guarded normally.
   */
  function shouldGuard() {
    const isPeek = guide.showingSolution && !!guide.currentGuide?.validation
    return playground.isDirty && !isPeek
  }

  /**
   * Open the dialog and resolve with the chosen action. A newer request
   * supersedes (cancels) any prompt still awaiting a choice.
   */
  function prompt(): Promise<UnsavedChangeChoice> {
    unsavedDebug('prompt: opening dialog')
    resolver?.('cancel')
    resolver = null
    isOpen.value = true
    return new Promise<UnsavedChangeChoice>((resolve) => {
      resolver = resolve
    })
  }

  function choose(choice: UnsavedChangeChoice) {
    unsavedDebug('prompt: choice', choice)
    const resolve = resolver
    resolver = null
    isOpen.value = false
    resolve?.(choice)
  }

  /**
   * Resolve whether an action that would overwrite the playground should
   * proceed. Returns `true` immediately when there is nothing to lose;
   * otherwise it opens the dialog and, on "Save & continue", snapshots first.
   *
   * `message` is stored on the snapshot so the recovery point explains itself.
   */
  async function confirmOrDiscard(message: string): Promise<boolean> {
    unsavedDebug('confirmOrDiscard: requested', {
      message,
      isDirty: playground.isDirty,
      showingSolution: guide.showingSolution,
      guard: shouldGuard(),
    })

    if (!shouldGuard())
      return true

    const choice = await prompt()
    if (choice === 'cancel')
      return false
    if (choice === 'save') {
      await fm.saveSnapshot({ type: 'manual', message })
    }
    else {
      // "Leave without saving": stop tracking the current contents. Some
      // destinations (docs-only lessons) never remount the playground, so
      // without this the next navigation would warn again about edits the user
      // already chose to abandon.
      playground.markSaved()
    }

    return true
  }

  return {
    isOpen,
    prompt,
    choose,
    shouldGuard,
    confirmOrDiscard,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useUnsavedChangesStore, import.meta.hot))
