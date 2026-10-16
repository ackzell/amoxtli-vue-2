export const UNSAVED_DEBUG_TAG = '[unsaved-debug]'

/**
 * Enable unsaved-changes tracing by setting `window.__unsavedDebug = true` in
 * the browser console. Mirrors the `__challengeDebug` / `__almostnodeDebug`
 * flags used elsewhere.
 */
export function isUnsavedDebugEnabled(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__unsavedDebug
}

export function unsavedDebug(message: string, ...args: unknown[]): void {
  if (!isUnsavedDebugEnabled())
    return
  console.warn(UNSAVED_DEBUG_TAG, message, ...args)
}
