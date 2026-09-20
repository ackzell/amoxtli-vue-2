<script setup lang="ts">
import type { ThemedToken } from 'shiki/core'
import type { DiffRow, WordRange } from '~/shiki/diff'
import { computed, onMounted, shallowRef } from 'vue'
import { normalizeDiffLang, useDiffHighlighter } from '~/composables/useDiffHighlighter'
import { computeDiff } from '~/shiki/diff'

const props = withDefaults(defineProps<{
  /** Author-facing fence language; mapped to a shiki lang id. */
  lang?: string
  /** Label for the "before" (old) pane. */
  before?: string
  /** Label for the "after" (new) pane. */
  after?: string
  /** Old (before) file content. */
  oldString: string
  /** New (after) file content. */
  newString: string
  /** Max height of the diff panes before they scroll vertically. */
  maxHeight?: string
  /** Force a display mode; default side-by-side, falls back to line-by-line on narrow screens. */
  outputFormat?: 'side-by-side' | 'line-by-line'
}>(), {
  lang: 'plaintext',
})

const { t } = useI18n()

const highlighter = shallowRef<Awaited<ReturnType<typeof useDiffHighlighter>> | null>(null)
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

const isNarrow = useMediaQuery('(max-width: 767px)')
const activeFormat = computed<'side-by-side' | 'line-by-line'>(
  () => props.outputFormat ?? (isNarrow.value ? 'line-by-line' : 'side-by-side'),
)

onMounted(async () => {
  highlighter.value = await useDiffHighlighter()
})

// ─── Token rendering helpers ─────────────────────────────────────────────────

interface LineToken {
  text: string
  color: string
  bg: boolean
}

interface Pane {
  tokens: ThemedToken[][]
  fg?: string
}

interface Cell {
  row: DiffRow
  tokens: LineToken[]
}

interface SBSRow {
  key: string
  left: Cell | null
  right: Cell | null
}

interface StackRow {
  key: string
  row: DiffRow
  cell: Cell
}

function buildMark(text: string, ranges: WordRange[]): boolean[] {
  const marks = Array.from({ length: text.length }, () => false)
  for (const r of ranges) {
    for (let i = Math.max(0, r.start); i < Math.min(text.length, r.end); i++)
      marks[i] = true
  }
  return marks
}

function anyMarked(marks: boolean[], start: number, end: number): boolean {
  const s = Math.max(0, start)
  const e = Math.min(marks.length, end)
  for (let i = s; i < e; i++) {
    if (marks[i])
      return true
  }
  return false
}

/**
 * Render one line as shiki-colored token spans, splitting tokens at the
 * word-diff range boundaries so the changed sub-token gets a background.
 */
function renderLine(
  tokenLine: ThemedToken[] | undefined,
  fg: string | undefined,
  text: string,
  ranges: WordRange[],
): LineToken[] {
  const colorFor = (tok: ThemedToken): string => tok.color ?? fg ?? 'var(--code-fg)'

  if (!tokenLine || tokenLine.length === 0)
    return [{ text, color: fg ?? 'var(--code-fg)', bg: false }]

  // shiki token offsets are global within the whole code string; anchor to the
  // first token's offset so boundary math below stays line-local.
  const lineBase = tokenLine[0]?.offset ?? 0

  const marks = buildMark(text, ranges)
  if (!marks.some(Boolean)) {
    return tokenLine.map(tok => ({ text: tok.content, color: colorFor(tok), bg: false }))
  }

  const boundaries = new Set<number>()
  for (const r of ranges) {
    boundaries.add(Math.max(0, r.start))
    boundaries.add(Math.min(text.length, r.end))
  }

  const out: LineToken[] = []
  for (const tok of tokenLine) {
    const start = (tok.offset ?? lineBase) - lineBase
    const len = tok.content.length
    const end = start + len
    const color = colorFor(tok)

    const cuts: number[] = []
    for (let i = start + 1; i < end; i++) {
      if (boundaries.has(i))
        cuts.push(i)
    }

    if (cuts.length === 0) {
      out.push({ text: tok.content, color, bg: anyMarked(marks, start, end) })
      continue
    }

    let prev = start
    for (const cut of cuts) {
      const chunk = tok.content.slice(prev - start, cut - start)
      if (chunk)
        out.push({ text: chunk, color, bg: anyMarked(marks, prev, cut) })
      prev = cut
    }
    if (prev < end)
      out.push({ text: tok.content.slice(prev - start), color, bg: anyMarked(marks, prev, end) })
  }
  return out
}

function makeCell(row: DiffRow, side: 'old' | 'new', pane: Pane | null): Cell {
  const num = side === 'old' ? row.oldNo : row.newNo
  const idx = Math.max(0, (num ?? 1) - 1)
  return {
    row,
    tokens: renderLine(pane?.tokens[idx], pane?.fg, row.text, row.ranges),
  }
}

// ─── Render model ────────────────────────────────────────────────────────────

const model = computed<{ fg: string, sbs: SBSRow[], stack: StackRow[] } | null>(() => {
  const hl = highlighter.value
  if (!hl)
    return null

  const theme = isDark.value ? 'vesper' : 'amoxtli-light'
  const lang = normalizeDiffLang(props.lang)

  const tokenize = (code: string): Pane | null =>
    code ? hl.codeToTokens(code, { lang, theme }) : null

  const oldPane = tokenize(props.oldString)
  const newPane = tokenize(props.newString)
  const { groups } = computeDiff(props.oldString, props.newString)

  const sbs: SBSRow[] = []
  const stack: StackRow[] = []

  for (const g of groups) {
    if (g.kind === 'equal' && g.row) {
      const cell = makeCell(g.row, 'old', oldPane)
      sbs.push({ key: `${g.key}-push`, left: cell, right: makeCell(g.row, 'new', newPane) })
      stack.push({ key: `${g.key}-stack`, row: g.row, cell })
      continue
    }

    const n = Math.max(g.left.length, g.right.length)
    for (let i = 0; i < n; i++) {
      const l = g.left[i]
      const r = g.right[i]
      sbs.push({
        key: `${g.key}-sb-${i}`,
        left: l ? makeCell(l, 'old', oldPane) : null,
        right: r ? makeCell(r, 'new', newPane) : null,
      })
      if (l)
        stack.push({ key: `${g.key}-st-l-${i}`, row: l, cell: makeCell(l, 'old', oldPane) })
      if (r)
        stack.push({ key: `${g.key}-st-r-${i}`, row: r, cell: makeCell(r, 'new', newPane) })
    }
  }

  return { fg: oldPane?.fg ?? newPane?.fg ?? '', sbs, stack }
})

function rowClass(c: Cell | null): string {
  if (!c)
    return ''
  if (c.row.type === 'remove')
    return 'line-del'
  if (c.row.type === 'add')
    return 'line-add'
  return ''
}

function lineClass(row: DiffRow): string {
  if (row.type === 'remove')
    return 'line-del'
  if (row.type === 'add')
    return 'line-add'
  return ''
}

function markerClass(row: DiffRow): string {
  if (row.type === 'remove')
    return 'line-del-marker'
  if (row.type === 'add')
    return 'line-add-marker'
  return ''
}

function wordClass(row: DiffRow): string {
  return row.type === 'remove' ? 'word-del' : 'word-add'
}
</script>

<template>
  <div class="diff-root text-[13px] leading-6 font-code">
    <header
      class="diff-file-header"
      :class="activeFormat === 'side-by-side' ? 'diff-file-header-side-by-side' : 'diff-file-header-stack'"
      aria-label="diff"
    >
      <span class="diff-file-label">{{ before }}</span>
      <template v-if="activeFormat === 'side-by-side'">
        <span class="diff-file-label">{{ after }}</span>
      </template>
      <template v-else>
        <span class="diff-file-arrow" aria-hidden="true" i-mynaui-arrow-right />
        <span class="diff-file-label">{{ after }}</span>
      </template>
    </header>

    <div
      class="diff-scroll overflow-auto"
      :style="{
        'maxHeight': maxHeight || undefined,
        '--code-fg': model?.fg ?? '',
      }"
    >
      <template v-if="model">
        <table
          v-if="activeFormat === 'side-by-side'"
          key="side-by-side"
          class="diff-table w-full border-collapse"
          role="grid"
        >
          <tbody>
            <tr
              v-for="row in model.sbs"
              :key="row.key"
              class="diff-row"
            >
              <td
                class="diff-gutter diff-gutter-left"
                :class="rowClass(row.left)"
              >
                {{ row.left?.row.oldNo ?? '' }}
              </td>
              <td
                class="diff-code-cell"
                :class="rowClass(row.left)"
              >
                <span
                  v-if="row.left"
                  class="diff-line"
                  :class="markerClass(row.left.row)"
                >
                  <span class="diff-marker" aria-hidden="true" />
                  <template v-for="(tok, i) in row.left.tokens" :key="i">
                    <span
                      class="diff-tok"
                      :class="tok.bg ? wordClass(row.left.row) : ''"
                      :style="{ color: tok.color }"
                    >{{ tok.text }}</span>
                  </template>
                </span>
              </td>
              <td
                class="diff-gutter diff-gutter-right"
                :class="rowClass(row.right)"
              >
                {{ row.right?.row.newNo ?? '' }}
              </td>
              <td
                class="diff-code-cell"
                :class="rowClass(row.right)"
              >
                <span
                  v-if="row.right"
                  class="diff-line"
                  :class="markerClass(row.right.row)"
                >
                  <span class="diff-marker" aria-hidden="true" />
                  <template v-for="(tok, i) in row.right.tokens" :key="i">
                    <span
                      class="diff-tok"
                      :class="tok.bg ? wordClass(row.right.row) : ''"
                      :style="{ color: tok.color }"
                    >{{ tok.text }}</span>
                  </template>
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <table
          v-else
          key="line-by-line"
          class="diff-table w-full border-collapse"
          role="grid"
        >
          <tbody>
            <tr
              v-for="row in model.stack"
              :key="row.key"
              class="diff-row"
            >
              <td
                class="diff-gutter diff-gutter-old"
                :class="lineClass(row.row)"
              >
                {{ row.row.oldNo ?? '' }}
              </td>
              <td
                class="diff-gutter diff-gutter-new"
                :class="lineClass(row.row)"
              >
                {{ row.row.newNo ?? '' }}
              </td>
              <td
                class="diff-code-cell"
                :class="lineClass(row.row)"
              >
                <span
                  class="diff-line"
                  :class="markerClass(row.row)"
                >
                  <span class="diff-marker" aria-hidden="true" />
                  <template v-for="(tok, i) in row.cell.tokens" :key="i">
                    <span
                      class="diff-tok"
                      :class="tok.bg ? wordClass(row.row) : ''"
                      :style="{ color: tok.color }"
                    >{{ tok.text }}</span>
                  </template>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
      <div v-else class="diff-loading text-sm font-sans py-8 text-center">
        {{ t('loading') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.diff-root {
  border: 1px solid var(--colors-bgr-200);
  border-radius: 0.5rem;
  overflow: hidden;
  background-color: var(--colors-bgr-50);
}

.dark .diff-root {
  border-color: var(--colors-bgr-700);
  background-color: var(--colors-bgr-dark);
}

.diff-file-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-family: var(--font-sans);
  border-bottom: none;
  background-color: color-mix(in oklab, var(--colors-bgr-100) 60%, transparent);
}

.dark .diff-file-header {
  border-bottom-color: var(--colors-bgr-700);
  background-color: color-mix(in oklab, var(--colors-bgr-dark) 60%, transparent);
}

/* Side-by-side: one label per pane, aligned over that pane's code area. */
.diff-file-header-side-by-side {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  padding: 0;
}

.diff-file-header-side-by-side .diff-file-label {
  padding: 0.5rem 0.75rem;
  padding-left: 2rem;
}

.diff-file-header-side-by-side .diff-file-label-after {
  border-left: 1px solid var(--colors-bgr-100);
}

.dark .diff-file-header-side-by-side .diff-file-label-after {
  border-left-color: var(--colors-bgr-800);
}

.diff-file-arrow {
  color: var(--colors-bgr-400);
}

.dark .diff-file-arrow {
  color: var(--colors-bgr-400);
}

.diff-file-label {
  color: var(--colors-bgr-500);
}

.dark .diff-file-label {
  color: var(--colors-bgr-300);
}

.diff-scroll {
  scrollbar-width: thin;
}

.diff-table {
  width: 100%;
}

.diff-table,
.diff-table td {
  border: none;
}

.diff-row {
  vertical-align: top;
  color: var(--code-fg);
}

.diff-gutter {
  padding: 0 0.5rem;
  text-align: right;
  white-space: nowrap;
  color: var(--colors-bgr-400);
  font-size: 0.75rem;
  user-select: none;
  border-right: 1px solid var(--colors-bgr-100);
  background-color: var(--colors-bgr-50);
}

.diff-gutter-right {
  border-left: 1px solid var(--colors-bgr-100);
}

.diff-gutter-old {
  border-right: none;
}

.dark .diff-gutter {
  border-color: var(--colors-bgr-800);
  background-color: var(--colors-bgr-dark);
}

.diff-code-cell {
  padding: 0 0.75rem;
  white-space: pre-wrap;
  background-color: var(--colors-bgr-50);
}

.dark .diff-code-cell {
  background-color: var(--colors-bgr-dark);
}

/* Line-level add/del tints (applied to both gutter and code cells). */
.line-del {
  background-color: color-mix(in oklab, var(--colors-negative-500) 12%, transparent);
}

.line-add {
  background-color: color-mix(in oklab, var(--colors-positive-500) 12%, transparent);
}

.dark td.line-del {
  background-color: color-mix(in oklab, var(--colors-negative-500) 14%, var(--colors-bgr-dark));
}

.dark td.line-add {
  background-color: color-mix(in oklab, var(--colors-positive-500) 14%, var(--colors-bgr-dark));
}

.diff-line {
  display: inline;
}

.diff-marker {
  display: inline-block;
  min-width: 1.25rem;
  user-select: none;
}

.line-del-marker .diff-marker::before {
  content: '−';
  color: var(--colors-negative-500);
}

.line-add-marker .diff-marker::before {
  content: '+';
  color: var(--colors-positive-500);
}

/* Word-level change backgrounds. */
.word-del {
  padding: 1px;
  background-color: color-mix(in oklab, var(--colors-negative-500) 42%, transparent);
  border-radius: 2px;
}

.word-add {
  padding: 1px;
  background-color: color-mix(in oklab, var(--colors-positive-500) 42%, transparent);
  border-radius: 2px;
}

.diff-loading {
  color: var(--colors-bgr-400);
}
</style>
