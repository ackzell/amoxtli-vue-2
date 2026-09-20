import { diffLines, diffWords } from 'diff'

export interface WordRange {
  start: number
  end: number
}

export interface DiffRow {
  /** stable key for v-for */
  key: string
  type: 'equal' | 'remove' | 'add'
  /** 1-based line number in the old file (null for added lines) */
  oldNo: number | null
  /** 1-based line number in the new file (null for removed lines) */
  newNo: number | null
  text: string
  /** word-level changed segments; only set on lines inside a paired change hunk */
  ranges: WordRange[]
}

export interface DiffGroup {
  key: string
  kind: 'equal' | 'change'
  /** single row for equal groups */
  row: DiffRow | null
  /** removed lines in order */
  left: DiffRow[]
  /** added lines in order */
  right: DiffRow[]
}

export interface DiffResult {
  groups: DiffGroup[]
}

/**
 * Split a diff part value into its lines, dropping the trailing empty
 * element that a final `\n` produces (and stripping stray `\r`).
 */
function splitLines(value: string): string[] {
  if (!value)
    return []
  const lines = value.split('\n')
  if (lines[lines.length - 1] === '')
    lines.pop()
  return lines.map(line => line.replace(/\r$/, ''))
}

/**
 * Pair removed/added lines by order within one hunk and compute the
 * word-level changed ranges for each side of the pair.
 * Whitespace-only segments are discarded (GitHub-style: an indent-only change
 * gets line tint but no word background).
 */
function applyWordDiff(left: DiffRow[], right: DiffRow[]) {
  const n = Math.min(left.length, right.length)
  for (let i = 0; i < n; i++) {
    const a = left[i]
    const b = right[i]
    if (!a || !b)
      continue
    if (!a.text || !b.text)
      continue

    const parts = diffWords(a.text, b.text)
    const rem: WordRange[] = []
    const add: WordRange[] = []
    let oldOff = 0
    let newOff = 0

    for (const part of parts) {
      const len = part.value.length
      // Parts present in the old text: unchanged + removed tokens.
      if (!part.added) {
        if (part.removed)
          rem.push({ start: oldOff, end: oldOff + len })
        oldOff += len
      }
      // Parts present in the new text: unchanged + added tokens.
      if (!part.removed) {
        if (part.added)
          add.push({ start: newOff, end: newOff + len })
        newOff += len
      }
    }

    a.ranges = rem.filter(range => !isWhitespaceOnly(a.text, range))
    b.ranges = add.filter(range => !isWhitespaceOnly(b.text, range))
  }
}

function isWhitespaceOnly(text: string, range: WordRange): boolean {
  const start = Math.max(0, Math.min(range.start, text.length))
  const end = Math.max(start, Math.min(range.end, text.length))
  const segment = text.slice(start, end)
  return segment.length === 0 || /^\s+$/.test(segment)
}

export function computeDiff(oldString: string, newString: string): DiffResult {
  const parts = diffLines(oldString, newString)
  const rows: DiffRow[] = []
  let oldCursor = 0
  let newCursor = 0

  for (const part of parts) {
    const lines = splitLines(part.value)
    if (part.added) {
      for (const text of lines) {
        rows.push({
          key: `new-${++newCursor}`,
          type: 'add',
          oldNo: null,
          newNo: newCursor,
          text,
          ranges: [],
        })
      }
    }
    else if (part.removed) {
      for (const text of lines) {
        rows.push({
          key: `old-${++oldCursor}`,
          type: 'remove',
          oldNo: oldCursor,
          newNo: null,
          text,
          ranges: [],
        })
      }
    }
    else {
      for (const text of lines) {
        oldCursor++
        newCursor++
        rows.push({
          key: `eq-${oldCursor}`,
          type: 'equal',
          oldNo: oldCursor,
          newNo: newCursor,
          text,
          ranges: [],
        })
      }
    }
  }

  // Group rows into equal rows / change hunks; hunks keep removed and added
  // lines separate (left/right) so the renderer can align them side-by-side
  // or stack them in line-by-line mode.
  const groups: DiffGroup[] = []
  let gid = 0
  let current: DiffGroup | null = null

  for (const row of rows) {
    if (row.type === 'equal') {
      if (current) {
        applyWordDiff(current.left, current.right)
        groups.push(current)
        current = null
      }
      groups.push({ key: `g-${gid++}`, kind: 'equal', row, left: [], right: [] })
      continue
    }

    current ??= { key: `g-${gid++}`, kind: 'change', row: null, left: [], right: [] }
    if (row.type === 'remove')
      current.left.push(row)
    else
      current.right.push(row)
  }

  if (current) {
    applyWordDiff(current.left, current.right)
    groups.push(current)
  }

  return { groups }
}
