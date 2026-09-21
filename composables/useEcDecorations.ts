import type { ComputedRef, Ref } from 'vue'
import type { ParsedEcInfo } from './useEcParser'
import { computed, h, nextTick, ref, render } from 'vue'
import ProsePreCollapseWidget from '~/components/content/ProsePreCollapseWidget.vue'
import { highlightPalette } from '~/configs/ecHighlight'

export function useEcDecorations(
  preEl: Ref<HTMLElement | undefined>,
  parsedEc: ComputedRef<ParsedEcInfo>,
) {
  const appConfig = useAppConfig()
  const expandedCollapseRanges = ref(new Set<string>())

  // First DOM text node inside an element, in document order. Shiki emits each
  // line as `<span class="line">` containing token `<span>`s and/or raw text;
  // the diff marker lives at the very start of the first such node regardless
  // of wrapping (e.g. a `.ec-highlight` mark or twoslash hover span).
  function firstTextNodeIn(root: ChildNode): Text | null {
    if (root.nodeType === Node.TEXT_NODE)
      return root as Text
    for (const child of root.childNodes) {
      const found = firstTextNodeIn(child)
      if (found)
        return found
    }
    return null
  }

  // Next text node after `start`, still inside `root`, in document order.
  // Shiki usually tokenizes the diff `+`/`-` marker as its own span, so the
  // alignment space that follows it lives in the following token's text node.
  function nextTextLeafIn(root: ChildNode, start: Text): Text | null {
    let foundStart = false
    const walk = (node: ChildNode): Text | null => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (foundStart)
          return node as Text
        if (node === start)
          foundStart = true
        return null
      }
      for (const child of node.childNodes) {
        const hit = walk(child)
        if (hit)
          return hit
      }
      return null
    }
    return walk(root)
  }

  const annotationPosition = computed(() => appConfig.codeSnippets?.annotation?.position === 'inline' ? 'inline' : 'row')
  const annotationPlacement = computed(() => {
    const v = appConfig.codeSnippets?.annotation?.rowPlacement
    return (v === 'before' || v === 'after' || v === 'top' || v === 'bottom') ? v : 'after'
  })

  let hoverAttached = false

  function setActiveAnnotation(code: HTMLElement, annKey: string | null) {
    code.querySelectorAll('[data-ec-ann]').forEach((el) => {
      if (annKey == null) {
        el.classList.remove('is-ec-active')
      }
      else {
        el.classList.toggle('is-ec-active', el.getAttribute('data-ec-ann') === annKey)
      }
    })
  }

  function setActiveHighlight(code: HTMLElement, hlGroup: string | null) {
    code.querySelectorAll('.ec-highlight').forEach((el) => {
      if (hlGroup == null) {
        el.classList.remove('is-hl-active')
      }
      else {
        el.classList.toggle('is-hl-active', el.getAttribute('data-ec-hl-group') === hlGroup)
      }
    })
  }

  function handleHover(event: MouseEvent) {
    const pre = preEl.value
    if (!pre)
      return
    const code = pre.querySelector('code')
    if (!code)
      return
    const target = event.target as Element
    const annGroup = target?.closest?.('[data-ec-ann]')
    setActiveAnnotation(code as HTMLElement, annGroup ? annGroup.getAttribute('data-ec-ann') : null)
    const hlMark = target?.closest?.('.ec-highlight')
    setActiveHighlight(code as HTMLElement, hlMark ? hlMark.getAttribute('data-ec-hl-group') : null)
  }

  function cleanupDecorations(codeEl: HTMLElement) {
    setActiveAnnotation(codeEl, null)
    setActiveHighlight(codeEl, null)

    codeEl.querySelectorAll('.ec-collapse-range').forEach((el) => {
      while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el)
      el.remove()
    })

    codeEl.querySelectorAll('.ec-collapse-widget, .ec-annotation-row').forEach((n) => {
      render(null, n as HTMLElement)
      n.remove()
    })

    codeEl.querySelectorAll<HTMLElement>('.line').forEach((line) => {
      line.classList.remove('ec-collapsed', 'ec-annotated', 'ec-annotation-inline', 'ec-ins', 'ec-del')
      line.removeAttribute('data-ec-note')
      line.removeAttribute('data-ec-ann')
      line.removeAttribute('title')

      // Restore the `+`/`-` diff marker that was stripped on apply
      const diffChar = line.getAttribute('data-diff-char')
      if (diffChar) {
        line.insertBefore(document.createTextNode(diffChar), line.firstChild)
        line.removeAttribute('data-diff-char')
      }

      // Remove existing marks and restore text
      line.querySelectorAll('mark.ec-highlight').forEach((mark) => {
        const textNode = document.createTextNode(mark.textContent || '')
        mark.parentNode?.replaceChild(textNode, mark)
      })

      const content = line.querySelector('.ec-annotated-content')
      if (content) {
        while (content.firstChild) line.insertBefore(content.firstChild, content)
        content.remove()
      }
    })
  }

  function ensureAnnotatedContent(line: HTMLElement) {
    let content = line.querySelector<HTMLElement>(':scope > .ec-annotated-content')
    if (!content) {
      content = document.createElement('span')
      content.className = 'ec-annotated-content'

      const twoslashNodes: ChildNode[] = []
      while (line.firstChild) {
        const child = line.firstChild
        if (
          child instanceof Element
          && child.classList.contains('twoslash-hover')
        ) {
          twoslashNodes.push(line.removeChild(child))
        }
        else {
          content.appendChild(child)
        }
      }

      if (twoslashNodes.length > 0) {
        line.append(...twoslashNodes)
        line.insertBefore(content, line.firstChild)
      }
      else {
        line.appendChild(content)
      }
    }
    return content
  }

  function assignHighlightGroups(codeEl: HTMLElement) {
    const highlights = parsedEc.value.highlights
    const paletteCount = highlightPalette.length

    // Dedupe identical markers (same pattern + kind): every occurrence should
    // share one hover group and one color, and shouldn't consume extra palette
    // slots. Preserve first-seen order.
    const uniquePatterns: { pattern: string, plain: boolean }[] = []
    for (const hl of highlights) {
      if (!hl)
        continue
      const plain = !!hl.plain
      if (!uniquePatterns.some(u => u.pattern === hl.pattern && u.plain === plain))
        uniquePatterns.push({ pattern: hl.pattern, plain })
    }

    const marks = codeEl.querySelectorAll<HTMLElement>('.ec-highlight')
    marks.forEach((mark) => {
      const text = mark.textContent || ''
      if (!text)
        return
      for (let i = 0; i < uniquePatterns.length; i++) {
        const entry = uniquePatterns[i]
        if (!entry || !entry.pattern)
          continue
        const { pattern, plain } = entry
        try {
          // Quoted markers are literal substrings; slash markers are regex.
          const source = plain
            ? pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            : pattern
          const regex = new RegExp(`^(?:${source})$`)
          if (regex.test(text)) {
            mark.setAttribute('data-ec-hl-group', String(i))
            mark.setAttribute('data-ec-hl-color', String(i % paletteCount))
            return
          }
        }
        catch {
          continue
        }
      }
    })
  }

  function applyEcDecorations() {
    const pre = preEl.value
    if (!pre || typeof window === 'undefined')
      return
    const code = pre.querySelector('code')
    if (!code)
      return
    const codeEl = code as HTMLElement

    if (!hoverAttached && typeof window !== 'undefined') {
      pre.addEventListener('mouseover', handleHover)
      pre.addEventListener('mouseout', handleHover)
      hoverAttached = true
    }

    cleanupDecorations(codeEl)

    const lines = code.querySelectorAll<HTMLElement>('.line')
    const lineMap = new Map<number, HTMLElement>()
    lines.forEach((line) => {
      const lineNo = Number(line.getAttribute('line'))
      if (Number.isFinite(lineNo))
        lineMap.set(lineNo, line)
    })

    const placeholders: HTMLElement[] = []

    // 1. Diff logic — inline `+` / `-` markers (EC-style diff-like syntax).
    //    Strip the marker (plus one optional alignment space) from the first
    //    text node of each changed line, then mark the line for styling. The
    //    original marker is stashed in data-diff-char so cleanup can restore
    //    the block's raw text. Runs before collapse so collapsed lines are
    //    already dressed when their range container is built.
    if (parsedEc.value.diff) {
      lines.forEach((line) => {
        const firstText = firstTextNodeIn(line)
        if (!firstText || firstText.textContent === null)
          return
        const marker = firstText.textContent[0]
        if (marker !== '+' && marker !== '-')
          return
        const remainder = firstText.textContent.slice(1)
        // Strip the marker + ONE optional alignment space. When the marker is
        // its own token the space lives in the next text leaf — consume it from
        // there so real indentation is preserved exactly.
        if (remainder.startsWith(' ')) {
          firstText.textContent = remainder.slice(1)
        }
        else {
          firstText.textContent = remainder
          const second = nextTextLeafIn(line, firstText)
          if (second?.textContent?.startsWith(' ')) {
            second.textContent = second.textContent.slice(1)
          }
        }
        line.classList.add(marker === '+' ? 'ec-ins' : 'ec-del')
        line.setAttribute('data-diff-char', marker)
      })
    }

    // 1b. Collapse logic
    parsedEc.value.collapseRanges.forEach((range) => {
      const key = `${range.start}-${range.end}`
      const isExpanded = expandedCollapseRanges.value.has(key)
      const firstLine = lineMap.get(range.start)
      if (!firstLine)
        return

      const rangeContainer = document.createElement('div')
      rangeContainer.className = `ec-collapse-range ${isExpanded ? 'is-expanded' : 'is-collapsed'}`

      const widget = document.createElement('span')
      widget.className = 'line ec-collapse-widget'
      widget.setAttribute('line', '…')
      widget.setAttribute('data-start-line', String(range.start))
      widget.setAttribute('data-end-line', String(range.end))

      render(h(ProsePreCollapseWidget, {
        expanded: isExpanded,
        lineCount: range.end - range.start + 1,
        toggleable: appConfig.codeSnippets?.collapse?.toggleable !== false,
        onToggle: () => {
          if (expandedCollapseRanges.value.has(key))
            expandedCollapseRanges.value.delete(key)
          else expandedCollapseRanges.value.add(key)
          applyEcDecorations()
        },
      }), widget)

      codeEl.insertBefore(rangeContainer, firstLine)
      rangeContainer.appendChild(widget)
      placeholders.push(widget)

      for (let i = range.start; i <= range.end; i++) {
        const l = lineMap.get(i)
        if (l) {
          rangeContainer.appendChild(l)
          if (!isExpanded)
            l.classList.add('ec-collapsed')
        }
      }
    })

    // 2. Annotation logic
    parsedEc.value.annotations.forEach((anno, annIndex) => {
      const annKey = String(annIndex)
      const start = Math.min(...anno.lines); const end = Math.max(...anno.lines)
      let firstLineEl: HTMLElement | undefined

      for (let i = start; i <= end; i++) {
        const l = lineMap.get(i)
        if (l) {
          l.classList.add('ec-annotated')
          l.setAttribute('data-ec-ann', annKey)
          ensureAnnotatedContent(l)
          if (!firstLineEl && i === start)
            firstLineEl = l
        }
      }

      const isCollapsed = firstLineEl?.classList.contains('ec-collapsed')
      const anchor = (firstLineEl && !isCollapsed)
        ? firstLineEl
        : placeholders.find((p) => {
            const s = Number(p.getAttribute('data-start-line')); const e = Number(p.getAttribute('data-end-line'))
            return start >= s && start <= e
          })

      if (anchor) {
        if (annotationPosition.value === 'inline') {
          anchor.classList.add('ec-annotation-inline'); anchor.setAttribute('data-ec-note', anno.text)
        }
        else {
          const row = document.createElement('div'); row.className = 'ec-annotation-row'; row.textContent = anno.text
          row.setAttribute('data-ec-ann', annKey)
          anchor.insertAdjacentElement(annotationPlacement.value === 'before' ? 'beforebegin' : 'afterend', row)
        }
      }
    })

    // 3. Assign per-pattern highlight groups
    assignHighlightGroups(codeEl)
  }

  return {
    applyEcDecorations,
    collapseRanges: computed(() => parsedEc.value.collapseRanges),
    expandedCollapseRanges,
    resetDecorations: () => { expandedCollapseRanges.value.clear(); nextTick(applyEcDecorations) },
    expandAll: () => {
      parsedEc.value.collapseRanges.forEach(r => expandedCollapseRanges.value.add(`${r.start}-${r.end}`))
      applyEcDecorations()
    },
    collapseAll: () => { expandedCollapseRanges.value.clear(); applyEcDecorations() },
  }
}
