<script setup lang="ts">
const props = defineProps<{
  code?: string
  language?: string
  filename?: string
  meta?: string
}>()

const attrs = useAttrs()
const copied = ref(false)
const preEl = ref<HTMLElement>()
const { copy } = useClipboard()
const appConfig = useAppConfig()

const annotationPosition = computed<'row' | 'inline'>(() =>
  appConfig.codeSnippets?.annotation?.position === 'inline' ? 'inline' : 'row',
)

const annotationRowPlacement = computed<'before' | 'after' | 'top' | 'bottom'>(() => {
  const value = appConfig.codeSnippets?.annotation?.rowPlacement
  if (value === 'before' || value === 'after' || value === 'top' || value === 'bottom')
    return value
  return 'after'
})

const isCollapseToggleable = computed(() =>
  appConfig.codeSnippets?.collapse?.toggleable !== false,
)

const ecInfo = computed(() => `${props.language || ''} ${props.meta || ''}`.trim())

function parseRanges(input: string): number[] {
  const values = new Set<number>()
  for (const part of input.split(',').map(i => i.trim()).filter(Boolean)) {
    const [startRaw, endRaw] = part.split('-').map(i => i.trim())
    const start = Number(startRaw)
    const end = endRaw ? Number(endRaw) : start
    if (!Number.isFinite(start) || !Number.isFinite(end))
      continue
    const from = Math.min(start, end)
    const to = Math.max(start, end)
    for (let i = from; i <= to; i++)
      values.add(i)
  }
  return [...values]
}

interface Annotation {
  text: string
  lines: number[]
}

interface CollapseRange {
  start: number
  end: number
}

function parseCollapseRanges(input: string): CollapseRange[] {
  const ranges: CollapseRange[] = []
  for (const part of input.split(',').map(i => i.trim()).filter(Boolean)) {
    const [startRaw, endRaw] = part.split('-').map(i => i.trim())
    const start = Number(startRaw)
    const end = endRaw ? Number(endRaw) : start
    if (!Number.isFinite(start) || !Number.isFinite(end))
      continue
    ranges.push({
      start: Math.min(start, end),
      end: Math.max(start, end),
    })
  }
  return ranges.sort((a, b) => a.start - b.start)
}

function parseEcInfo(input: string) {
  const file = input.match(/(?:^|\s)file:(\S+)/)?.[1] || ''
  const title = input.match(/(?:^|\s)title="([^"]+)"/)?.[1] || ''
  const collapseRaw = input.match(/(?:^|\s)collapse=\{([^}]+)\}/)?.[1] || ''
  const collapseRanges = collapseRaw ? parseCollapseRanges(collapseRaw) : []
  const collapseLines = collapseRaw ? parseRanges(collapseRaw) : []

  const annotations: Annotation[] = []
  const annotationRegex = /\{"([^"]+)":([0-9,\- ]+)\}/g
  let match: RegExpExecArray | null = annotationRegex.exec(input)
  while (match) {
    const text = match[1]?.trim()
    const ranges = match[2]?.trim()
    if (text && ranges) {
      annotations.push({
        text,
        lines: parseRanges(ranges),
      })
    }
    match = annotationRegex.exec(input)
  }

  return {
    file,
    title,
    collapseRanges,
    collapseLines,
    annotations,
  }
}

const parsedEc = computed(() => parseEcInfo(ecInfo.value))

const language = computed(() => {
  const value = (props.language || '').toLowerCase()
  if (!value.startsWith('file:'))
    return value
  const file = parsedEc.value.file.toLowerCase()
  const ext = file.split('.').pop() || ''
  if (ext === 'vue')
    return 'vue'
  if (ext === 'ts')
    return 'typescript'
  if (ext === 'js')
    return 'javascript'
  if (ext === 'html')
    return 'html'
  if (ext === 'css')
    return 'css'
  if (ext === 'json')
    return 'json'
  return value
})

const inferredFilename = computed(() => {
  if (parsedEc.value.title)
    return parsedEc.value.title
  if (parsedEc.value.file)
    return parsedEc.value.file
  if (props.filename)
    return props.filename
  if (props.meta) {
    const match = props.meta.match(/\[([^\]]+)\]/)
    if (match?.[1])
      return match[1]
  }
  return ''
})

const iconClass = computed(() => {
  if (language.value === 'vue')
    return 'i-carbon-logo-vue'
  if (language.value === 'ts' || language.value === 'typescript')
    return 'i-carbon-logo-typescript'
  if (language.value === 'js' || language.value === 'javascript')
    return 'i-carbon-logo-javascript'
  if (language.value === 'html')
    return 'i-carbon-html5'
  if (language.value === 'css')
    return 'i-carbon-css3'
  if (language.value === 'json')
    return 'i-carbon-json'
  return 'i-carbon-code'
})

const preAttrs = computed(() => {
  const { class: _class, ...rest } = attrs as Record<string, unknown>
  return rest
})

const preClass = computed(() => (attrs as Record<string, unknown>).class)
const expandedCollapseRanges = ref(new Set<string>())

function rangeKey(start: number, end: number) {
  return `${start}-${end}`
}

function toggleCollapseRange(key: string) {
  if (expandedCollapseRanges.value.has(key))
    expandedCollapseRanges.value.delete(key)
  else
    expandedCollapseRanges.value.add(key)

  applyEcDecorations()
}

function applyEcDecorations() {
  const pre = preEl.value
  if (!pre)
    return

  const code = pre.querySelector('code')
  if (!code)
    return
  const codeEl = code as HTMLElement

  const lines = code.querySelectorAll<HTMLElement>('.line')
  if (!lines.length)
    return

  code.querySelectorAll('.ec-collapse-placeholder, .ec-collapse-expanded').forEach(node => node.remove())
  code.querySelectorAll('.ec-annotation-row').forEach(node => node.remove())

  lines.forEach((line) => {
    line.classList.remove('ec-collapsed', 'ec-annotated', 'ec-annotation-inline')
    line.removeAttribute('data-ec-note')
    line.removeAttribute('title')
  })

  const lineMap = new Map<number, HTMLElement>()
  lines.forEach((line) => {
    const lineNo = Number(line.getAttribute('line'))
    if (Number.isFinite(lineNo))
      lineMap.set(lineNo, line)
  })

  const placeholders: HTMLElement[] = []
  for (const range of parsedEc.value.collapseRanges) {
    const key = rangeKey(range.start, range.end)
    const isExpanded = expandedCollapseRanges.value.has(key)
    const firstLine = lineMap.get(range.start)
    if (!firstLine)
      continue

    const placeholder = document.createElement('span')
    placeholder.className = `line ${isExpanded ? 'ec-collapse-expanded' : 'ec-collapse-placeholder'}`
    placeholder.setAttribute('line', '…')
    placeholder.setAttribute('data-start-line', String(range.start))
    placeholder.setAttribute('data-end-line', String(range.end))
    placeholder.setAttribute('data-range-key', key)

    const lineCount = range.end - range.start + 1
    placeholder.textContent = isExpanded
      ? `⌃ hide ${lineCount} line${lineCount > 1 ? 's' : ''}`
      : `⋯ ${lineCount} line${lineCount > 1 ? 's' : ''} collapsed`

    if (isCollapseToggleable.value) {
      placeholder.setAttribute('role', 'button')
      placeholder.setAttribute('tabindex', '0')
      placeholder.setAttribute('aria-expanded', String(isExpanded))

      const onToggle = () => toggleCollapseRange(key)
      placeholder.addEventListener('click', onToggle)
      placeholder.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onToggle()
        }
      })
    }

    codeEl.insertBefore(placeholder, firstLine)
    placeholders.push(placeholder)

    if (!isExpanded) {
      for (let lineNo = range.start; lineNo <= range.end; lineNo++) {
        const line = lineMap.get(lineNo)
        if (line)
          line.classList.add('ec-collapsed')
      }
    }
  }

  const insertAfterMap = new Map<HTMLElement, HTMLElement>()
  const insertBeforeMap = new Map<HTMLElement, HTMLElement>()

  function findPlaceholderForAnnotation(annotationLines: number[]) {
    if (!annotationLines.length)
      return undefined

    const lineSet = new Set(annotationLines)
    return placeholders.find((placeholder) => {
      const start = Number(placeholder.getAttribute('data-start-line'))
      const end = Number(placeholder.getAttribute('data-end-line'))
      if (!Number.isFinite(start) || !Number.isFinite(end))
        return false

      for (let lineNo = start; lineNo <= end; lineNo++) {
        if (lineSet.has(lineNo))
          return true
      }
      return false
    })
  }

  function findPlaceholderForLine(lineNo: number) {
    return placeholders.find((placeholder) => {
      const start = Number(placeholder.getAttribute('data-start-line'))
      const end = Number(placeholder.getAttribute('data-end-line'))
      if (!Number.isFinite(start) || !Number.isFinite(end))
        return false
      return lineNo >= start && lineNo <= end
    })
  }

  function insertAnnotationRow(anchor: HTMLElement, text: string) {
    const note = document.createElement('span')
    note.className = 'line ec-annotation-row'
    note.setAttribute('line', '')
    note.textContent = text

    if (annotationRowPlacement.value === 'top') {
      codeEl.insertBefore(note, codeEl.firstChild)
      return
    }

    if (annotationRowPlacement.value === 'bottom') {
      codeEl.appendChild(note)
      return
    }

    if (annotationRowPlacement.value === 'before') {
      const previousInserted = insertBeforeMap.get(anchor)
      if (previousInserted) {
        previousInserted.insertAdjacentElement('afterend', note)
        insertBeforeMap.set(anchor, note)
        return
      }

      anchor.insertAdjacentElement('beforebegin', note)
      insertBeforeMap.set(anchor, note)
      return
    }

    const previousInserted = insertAfterMap.get(anchor)
    if (previousInserted) {
      previousInserted.insertAdjacentElement('afterend', note)
      insertAfterMap.set(anchor, note)
      return
    }

    anchor.insertAdjacentElement('afterend', note)
    insertAfterMap.set(anchor, note)
  }

  for (const annotation of parsedEc.value.annotations) {
    const lineSet = new Set(annotation.lines)
    const startLineNo = Math.min(...annotation.lines)
    let startLine: HTMLElement | undefined
    lines.forEach((line) => {
      const lineNo = Number(line.getAttribute('line'))
      if (!lineSet.has(lineNo))
        return
      line.classList.add('ec-annotated')

      if (!startLine && lineNo === startLineNo)
        startLine = line
    })

    const startCollapsed = startLine?.classList.contains('ec-collapsed')

    const anchor = (startLine && !startCollapsed)
      ? startLine
      : findPlaceholderForLine(startLineNo) || findPlaceholderForAnnotation(annotation.lines)
    if (!anchor)
      continue

    if (annotationPosition.value === 'inline') {
      anchor.classList.add('ec-annotation-inline')
      anchor.setAttribute('data-ec-note', annotation.text)
      anchor.setAttribute('title', annotation.text)
      continue
    }

    insertAnnotationRow(anchor, annotation.text)
  }
}

onMounted(() => {
  nextTick(() => {
    applyEcDecorations()
  })
})

watch(() => [props.code, props.meta, props.language], () => {
  expandedCollapseRanges.value = new Set<string>()
  nextTick(() => {
    applyEcDecorations()
  })
})

async function copyCode() {
  const content = props.code || preEl.value?.textContent || ''
  if (!content)
    return

  await copy(content)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 1200)
}
</script>

<template>
  <div class="group relative my-5">
    <div
      v-if="inferredFilename"
      class="ec-header"
    >
      <div class="size-4 shrink-0" :class="iconClass" />
      <span class="text-sm/6 op80">{{ inferredFilename }}</span>
    </div>

    <IconButton
      unstyled
      tooltip="Copy code to clipboard"
      tooltip-placement="left"
      class="ec-copy-button"
      aria-label="Copy code to clipboard"
      @click="copyCode"
    >
      <span :class="copied ? 'i-carbon-checkmark size-3.5' : 'i-carbon-copy size-3.5'" />
    </IconButton>

    <pre
      ref="preEl"
      v-bind="preAttrs"
      :class="[
        preClass,
        inferredFilename ? 'rounded-t-none! mt-0!' : '',
      ]"
    >
      <slot />
    </pre>
  </div>
</template>

<style scoped>
:deep(code .line) {
  display: block;
  min-height: 1.5rem;
  padding-left: 2.5rem;
  position: relative;
}

:deep(code .line::before) {
  content: attr(line);
  position: absolute;
  left: 0;
  width: 2rem;
  text-align: right;
  opacity: 0.45;
}

:deep(code .line.ec-collapsed) {
  display: none;
}

:deep(code .line.ec-collapse-placeholder) {
  margin: 0.2rem 0;
  padding: 0.2rem 0.5rem 0.2rem 2.5rem;
  font-size: 0.75rem;
  line-height: 1.2;
  opacity: 0.75;
  border-radius: 0.25rem;
  background: color-mix(in oklab, currentColor 10%, transparent);
  cursor: default;
}

:deep(code .line.ec-collapse-placeholder[role='button']) {
  cursor: pointer;
}

:deep(code .line.ec-collapse-expanded) {
  margin: 0.2rem 0;
  padding: 0.2rem 0.5rem 0.2rem 2.5rem;
  font-size: 0.75rem;
  line-height: 1.2;
  opacity: 0.7;
  border-radius: 0.25rem;
  background: color-mix(in oklab, currentColor 7%, transparent);
  cursor: default;
}

:deep(code .line.ec-collapse-expanded[role='button']) {
  cursor: pointer;
}

:deep(code .line.ec-annotated) {
  background: color-mix(in oklab, currentColor 8%, transparent);
}

:deep(code .line.ec-annotation-row) {
  margin: 0.25rem 0 0.4rem 0;
  padding: 0.2rem 0.45rem;
  margin-left: 2.5rem;
  font-size: 0.7rem;
  line-height: 1.25;
  border-radius: 0.375rem;
  width: fit-content;
  max-width: min(100%, 36rem);
  opacity: 0.75;
  background: color-mix(in oklab, currentColor 14%, transparent);
}

:deep(code .line.ec-annotation-row::before) {
  content: '';
}

:deep(code .line.ec-annotation-inline) {
  padding-right: 22rem;
}

:deep(code .line.ec-annotation-inline::after) {
  content: attr(data-ec-note);
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.7rem;
  line-height: 1.2;
  padding: 0.2rem 0.45rem;
  border-radius: 0.375rem;
  max-width: min(20rem, 65%);
  white-space: normal;
  opacity: 0.75;
  background: color-mix(in oklab, currentColor 14%, transparent);
}

.ec-header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border);
  border-radius: 0.375rem 0.375rem 0 0;
  background: var(--bg);
}

.ec-copy-button {
  position: absolute;
  top: 11px;
  right: 11px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  background: var(--bg);
  opacity: 0.75;
  transition: opacity 0.2s ease;
}

.ec-copy-button:hover {
  opacity: 1;
}
</style>
