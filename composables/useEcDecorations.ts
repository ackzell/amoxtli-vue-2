import type { ComputedRef, Ref } from 'vue'
import type { ParsedEcInfo } from './useEcParser'
import { h, render } from 'vue'
import ProsePreCollapseWidget from '~/components/content/ProsePreCollapseWidget.vue'

export function useEcDecorations(
  preEl: Ref<HTMLElement | undefined>,
  parsedEc: ComputedRef<ParsedEcInfo>,
) {
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

  const collapseCollapsedIconClass = computed(() =>
    appConfig.codeSnippets?.collapse?.collapsedIconClass || 'i-mynaui-chevron-right',
  )

  const collapseExpandedIconClass = computed(() =>
    appConfig.codeSnippets?.collapse?.expandedIconClass || 'i-mynaui-chevron-down',
  )

  const collapseWidgetClass = computed(() =>
    appConfig.codeSnippets?.collapse?.widgetClass || '',
  )

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

    code.querySelectorAll<HTMLElement>('.ec-collapse-range').forEach((rangeEl) => {
      const widget = rangeEl.querySelector('.ec-collapse-widget')
      if (widget)
        render(null, widget)

      while (rangeEl.firstChild)
        rangeEl.parentNode?.insertBefore(rangeEl.firstChild, rangeEl)

      rangeEl.remove()
    })

    const lines = code.querySelectorAll<HTMLElement>('.line')
    if (!lines.length)
      return

    code.querySelectorAll('.ec-collapse-widget').forEach((node) => {
      render(null, node)
      node.remove()
    })
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

      const rangeContainer = document.createElement('div')
      rangeContainer.className = `ec-collapse-range ${isExpanded ? 'is-expanded' : 'is-collapsed'}`
      rangeContainer.setAttribute('data-start-line', String(range.start))
      rangeContainer.setAttribute('data-end-line', String(range.end))
      rangeContainer.setAttribute('data-range-key', key)

      const placeholder = document.createElement('span')
      placeholder.className = 'line ec-collapse-widget'
      placeholder.setAttribute('line', '…')
      placeholder.setAttribute('data-start-line', String(range.start))
      placeholder.setAttribute('data-end-line', String(range.end))
      placeholder.setAttribute('data-range-key', key)

      const lineCount = range.end - range.start + 1

      render(h(ProsePreCollapseWidget, {
        expanded: isExpanded,
        lineCount,
        toggleable: isCollapseToggleable.value,
        collapsedIconClass: collapseCollapsedIconClass.value,
        expandedIconClass: collapseExpandedIconClass.value,
        widgetClass: collapseWidgetClass.value,
        onToggle: () => toggleCollapseRange(key),
      }), placeholder)

      codeEl.insertBefore(rangeContainer, firstLine)
      rangeContainer.appendChild(placeholder)
      placeholders.push(placeholder)

      for (let lineNo = range.start; lineNo <= range.end; lineNo++) {
        const line = lineMap.get(lineNo)
        if (line)
          rangeContainer.appendChild(line)
      }

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

  function resetDecorations() {
    expandedCollapseRanges.value = new Set<string>()
    nextTick(() => applyEcDecorations())
  }

  return {
    expandedCollapseRanges,
    applyEcDecorations,
    toggleCollapseRange,
    resetDecorations,
  }
}
