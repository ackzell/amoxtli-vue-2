/*
 * Pure step-extraction and keyboard-navigation rules for `MagicMove`.
 *
 * Extracted from `components/content/MagicMove.client.vue` so the DOM-facing
 * logic (which has no dependency on Vue or the highlighter) can be pinned
 * directly. Kept dependency-free (DOM + strings only) so it stays portable if
 * the helper components are ever extracted into their own package.
 */

/**
 * Rebuild authored code from a highlighted `<pre>` element.
 *
 * Shiki renders one `.line` span per source line (blank lines carry an
 * `emptyLinePlaceholder` break), but @nuxtjs/mdc's compileToJSON drops the
 * newline text nodes, so `textContent` collapses lines together. Joining the
 * `.line` span texts — minus each line's trailing break (the blank-line
 * placeholder) — reproduces the authored step code exactly.
 */
export function getStepCode(pre: Element): string {
  const codeEl = pre.querySelector('code')
  if (!codeEl)
    return ''
  const lineEls = codeEl.querySelectorAll('.line')
  const raw = lineEls.length
    ? Array.from(lineEls, line => (line.textContent ?? '').replace(/\n$/, '')).join('\n')
    : codeEl.textContent ?? ''
  return raw.trimEnd()
}

/**
 * Resolve the target step for a container-level keydown (clamped, no wrap).
 * Returns `undefined` when `key` is not a step-navigation key.
 */
export function containerStepFromKey(
  key: string,
  current: number,
  last: number,
): number | undefined {
  if (key === 'ArrowRight' || key === 'ArrowDown' || key === 'PageDown')
    return Math.min(current + 1, last)
  if (key === 'ArrowLeft' || key === 'ArrowUp' || key === 'PageUp')
    return Math.max(current - 1, 0)
  if (/^[1-9]$/.test(key))
    return Math.min(Number(key) - 1, last)
  return undefined
}

/**
 * Resolve the target step for a tablist keydown (wrapping, with Home/End).
 * Returns `undefined` when `key` is not a tab-navigation key.
 */
export function tablistStepFromKey(
  key: string,
  current: number,
  count: number,
): number | undefined {
  if (count === 0)
    return undefined
  if (key === 'ArrowRight' || key === 'ArrowDown')
    return (current + 1) % count
  if (key === 'ArrowLeft' || key === 'ArrowUp')
    return (current - 1 + count) % count
  if (key === 'Home')
    return 0
  if (key === 'End')
    return count - 1
  return undefined
}
