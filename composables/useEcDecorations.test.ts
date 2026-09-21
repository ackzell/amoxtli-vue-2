import type { Ref } from 'vue'
import type { ParsedEcInfo } from './useEcParser'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
// @vitest-environment happy-dom
import { computed, nextTick, ref } from 'vue'
import { useEcDecorations } from './useEcDecorations'

const appConfig = {
  codeSnippets: {
    annotation: { position: 'row' as 'row' | 'inline', rowPlacement: 'before' as 'before' | 'after' },
    collapse: { toggleable: true },
  },
}

beforeEach(() => {
  appConfig.codeSnippets.annotation.position = 'row'
  appConfig.codeSnippets.annotation.rowPlacement = 'before'
  appConfig.codeSnippets.collapse.toggleable = true
  vi.stubGlobal('useAppConfig', () => appConfig)
  vi.stubGlobal('computed', computed)
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

function defaults(): ParsedEcInfo {
  return {
    file: '',
    title: '',
    showLineNumbers: true,
    collapseRanges: [],
    collapseLines: [],
    annotations: [],
    highlights: [],
    labels: [],
    diff: false,
  }
}

function parsedRef(overrides: Partial<ParsedEcInfo>) {
  const state = ref({ ...defaults(), ...overrides })
  return computed(() => state.value)
}

function makeLine(text: string, lineNo: number): HTMLElement {
  const line = document.createElement('span')
  line.className = 'line'
  line.setAttribute('line', String(lineNo))
  line.textContent = text
  return line
}

function makePre(lines: HTMLElement[]): [HTMLElement, Ref<HTMLElement | undefined>] {
  const pre = document.createElement('pre')
  const code = document.createElement('code')
  for (const line of lines)
    code.appendChild(line)
  pre.appendChild(code)
  document.body.appendChild(pre)
  return [pre, ref(pre)]
}

function linesOf(code: HTMLElement): HTMLElement[] {
  return [...code.querySelectorAll<HTMLElement>('.line')]
}

describe('useEcDecorations — annotations', () => {
  it('applies inline annotations with data-ec-note', async () => {
    appConfig.codeSnippets.annotation.position = 'inline'
    const [pre, preRef] = makePre([makeLine('a', 1), makeLine('b', 2), makeLine('c', 3), makeLine('d', 4)])
    const parsed = parsedRef({ annotations: [{ text: 'my note', lines: [2, 3] }] })
    useEcDecorations(preRef, parsed).applyEcDecorations()

    const code = pre.querySelector('code')!
    const [l1, l2, l3, l4] = linesOf(code)
    expect(l2!.classList.contains('ec-annotated')).toBe(true)
    expect(l2!.classList.contains('ec-annotation-inline')).toBe(true)
    expect(l2!.getAttribute('data-ec-ann')).toBe('0')
    expect(l2!.getAttribute('data-ec-note')).toBe('my note')
    expect(l3!.getAttribute('data-ec-ann')).toBe('0')
    expect(l3!.classList.contains('ec-annotation-inline')).toBe(false)
    expect(l3!.getAttribute('data-ec-note')).toBeNull()
    expect(l2!.querySelector('.ec-annotated-content')?.textContent).toBe('b')
    expect(l1!.classList.contains('ec-annotated')).toBe(false)
    expect(l4!.classList.contains('ec-annotated')).toBe(false)
    expect(code.querySelector('.ec-annotation-row')).toBeNull()
  })

  it('wraps line 3 (but not the row) into ec-annotated-content when a twoslash hover is present', () => {
    const line = document.createElement('span')
    line.className = 'line'
    line.setAttribute('line', '3')
    line.innerHTML = '<span class="twoslash-hover">x</span>text'
    const [, preRef] = makePre([makeLine('a', 1), makeLine('b', 2), line])
    useEcDecorations(preRef, parsedRef({ annotations: [{ text: 'note', lines: [3] }] })).applyEcDecorations()
    expect(line.querySelectorAll('.ec-annotated-content').length).toBe(1)
    expect(line.querySelector('.ec-annotated-content')?.textContent).toBe('text')
    expect(line.querySelector('.twoslash-hover')).not.toBeNull()
  })

  it('places row annotations before the anchor line by default', () => {
    const [pre, preRef] = makePre([makeLine('a', 1), makeLine('b', 2), makeLine('c', 3)])
    useEcDecorations(preRef, parsedRef({ annotations: [{ text: 'note', lines: [3] }] })).applyEcDecorations()

    const code = pre.querySelector('code')!
    const l3 = linesOf(code)[2]!
    const row = l3.previousElementSibling as HTMLElement
    expect(row.classList.contains('ec-annotation-row')).toBe(true)
    expect(row.textContent).toBe('note')
    expect(row.getAttribute('data-ec-ann')).toBe('0')
    expect(l3.classList.contains('ec-annotation-inline')).toBe(false)
  })

  it('places row annotations after the anchor line when configured', () => {
    appConfig.codeSnippets.annotation.rowPlacement = 'after'
    const [pre, preRef] = makePre([makeLine('a', 1), makeLine('b', 2), makeLine('c', 3)])
    useEcDecorations(preRef, parsedRef({ annotations: [{ text: 'note', lines: [3] }] })).applyEcDecorations()

    const code = pre.querySelector('code')!
    const l3 = linesOf(code)[2]!
    expect((l3.nextElementSibling as HTMLElement).classList.contains('ec-annotation-row')).toBe(true)
  })

  it('expands contiguous annotation line spans from min..max (compensating lossy ranges)', () => {
    const [pre, preRef] = makePre([
      makeLine('a', 1),
      makeLine('b', 2),
      makeLine('c', 3),
      makeLine('d', 4),
      makeLine('e', 5),
    ])
    useEcDecorations(preRef, parsedRef({ annotations: [{ text: 'note', lines: [2, 4] }] })).applyEcDecorations()

    const code = pre.querySelector('code')!
    const marked = linesOf(code).filter(l => l.classList.contains('ec-annotated')).map(l => l.getAttribute('line'))
    expect(marked).toEqual(['2', '3', '4'])
  })
})

describe('useEcDecorations — collapse', () => {
  it('collapses a line range behind an expander widget and toggles on click', async () => {
    const [pre, preRef] = makePre([
      makeLine('a', 1),
      makeLine('b', 2),
      makeLine('c', 3),
      makeLine('d', 4),
      makeLine('e', 5),
    ])
    useEcDecorations(preRef, parsedRef({ collapseRanges: [{ start: 2, end: 4 }] })).applyEcDecorations()

    const code = pre.querySelector('code')!
    const container = code.querySelector('.ec-collapse-range') as HTMLElement
    expect(container).not.toBeNull()
    const codeLines = [...container.querySelectorAll<HTMLElement>('span.line:not(.ec-collapse-widget)')]
    expect(codeLines.length).toBe(3)
    for (const l of codeLines) {
      expect(l.classList.contains('ec-collapsed')).toBe(true)
    }

    const widget = container.querySelector('.ec-collapse-widget') as HTMLElement
    expect(widget.getAttribute('data-start-line')).toBe('2')
    expect(widget.getAttribute('data-end-line')).toBe('4')
    const trigger = widget.querySelector('.ec-collapse-widget-trigger') as HTMLElement
    expect(trigger.textContent).toContain('3 lines collapsed')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')

    await trigger.click()
    await nextTick()

    const widget2 = code.querySelector('.ec-collapse-widget') as HTMLElement
    expect((widget2.querySelector('.ec-collapse-widget-trigger') as HTMLElement).getAttribute('aria-expanded')).toBe('true')
    expect((widget2.querySelector('.ec-collapse-widget-trigger') as HTMLElement).textContent).toContain('Hide 3 lines')
    const codeLinesAfter = [...container.querySelectorAll<HTMLElement>('span.line:not(.ec-collapse-widget)')]
    expect(codeLinesAfter.every(l => !l.classList.contains('ec-collapsed'))).toBe(true)
  })

  it('reapplying is idempotent: one range container, one widget, no orphaned lines', async () => {
    const [pre, preRef] = makePre([makeLine('a', 1), makeLine('b', 2), makeLine('c', 3)])
    const deco = useEcDecorations(preRef, parsedRef({ collapseRanges: [{ start: 1, end: 2 }] }))
    deco.applyEcDecorations()
    deco.applyEcDecorations()

    const code = pre.querySelector('code')!
    expect(code.querySelectorAll('.ec-collapse-range').length).toBe(1)
    expect(code.querySelectorAll('.ec-collapse-widget').length).toBe(1)
    expect([...pre.querySelectorAll<HTMLElement>('.line')].map(l => l.getAttribute('line')))
      .toEqual(['…', '1', '2', '3'])
  })
})

describe('useEcDecorations — highlights', () => {
  function makeMarkedLine(lineNo: number, html: string): HTMLElement {
    const line = document.createElement('span')
    line.className = 'line'
    line.setAttribute('line', String(lineNo))
    line.innerHTML = html
    return line
  }

  it('assigns a group and palette color to each ec-highlight mark', () => {
    const [pre, preRef] = makePre([makeMarkedLine(1, '<span class="ec-highlight">foo</mark>')])
    useEcDecorations(preRef, parsedRef({ highlights: [{ pattern: 'foo' }] })).applyEcDecorations()

    const mark = pre.querySelector('.ec-highlight')!
    expect(mark.getAttribute('data-ec-hl-group')).toBe('0')
    expect(mark.getAttribute('data-ec-hl-color')).toBe('0')
  })

  it('dedupes repeated patterns so identical marks share one group and color', () => {
    const [pre, preRef] = makePre([
      makeMarkedLine(1, '<span class="ec-highlight">foo</mark>'),
      makeMarkedLine(2, '<span class="ec-highlight">bar</mark>'),
      makeMarkedLine(3, '<span class="ec-highlight">foo</mark>'),
    ])
    useEcDecorations(preRef, parsedRef({
      highlights: [{ pattern: 'foo' }, { pattern: 'bar' }, { pattern: 'foo' }],
    })).applyEcDecorations()

    const marks = [...pre.querySelectorAll<HTMLElement>('.ec-highlight')]
    expect(marks.map(m => m.getAttribute('data-ec-hl-group'))).toEqual(['0', '1', '0'])
    expect(marks.map(m => m.getAttribute('data-ec-hl-color'))).toEqual(['0', '1', '0'])
  })

  it('cycles the palette across unique patterns', () => {
    const [pre, preRef] = makePre([
      makeMarkedLine(1, '<span class="ec-highlight">a</mark>'),
      makeMarkedLine(2, '<span class="ec-highlight">b</mark>'),
      makeMarkedLine(3, '<span class="ec-highlight">c</mark>'),
      makeMarkedLine(4, '<span class="ec-highlight">d</mark>'),
    ])
    useEcDecorations(preRef, parsedRef({
      highlights: [{ pattern: 'a' }, { pattern: 'b' }, { pattern: 'c' }, { pattern: 'd' }],
    })).applyEcDecorations()

    const marks = [...pre.querySelectorAll<HTMLElement>('.ec-highlight')]
    expect(marks.map(m => m.getAttribute('data-ec-hl-color'))).toEqual(['0', '1', '2', '0'])
  })
})

describe('useEcDecorations — inline diff', () => {
  it('strips + / - markers, tags lines, and restores on reapply', () => {
    const [pre, preRef] = makePre([
      makeLine('keep', 1),
      makeLine('+ added', 2),
      makeLine('- removed', 3),
    ])
    const deco = useEcDecorations(preRef, parsedRef({ diff: true }))
    deco.applyEcDecorations()

    const code = pre.querySelector('code')!
    const [l1, l2, l3] = linesOf(code)
    expect(l1!.textContent).toBe('keep')
    expect(l2!.classList.contains('ec-ins')).toBe(true)
    expect(l2!.getAttribute('data-diff-char')).toBe('+')
    expect(l2!.textContent).toBe('added')
    expect(l3!.classList.contains('ec-del')).toBe(true)
    expect(l3!.getAttribute('data-diff-char')).toBe('-')
    expect(l3!.textContent).toBe('removed')

    deco.applyEcDecorations()
    expect(linesOf(code)[1]!.textContent).toBe('added')
    expect(linesOf(code)[1]!.getAttribute('data-diff-char')).toBe('+')
  })

  it('consumes the alignment space from the marker leaf when the marker is its own node', () => {
    const line = document.createElement('span')
    line.className = 'line'
    line.setAttribute('line', '2')
    line.innerHTML = '<span>+</span><span> bar</span>'
    const [, preRef] = makePre([makeLine('a', 1), line])

    useEcDecorations(preRef, parsedRef({ diff: true })).applyEcDecorations()
    expect(line.classList.contains('ec-ins')).toBe(true)
    expect(line.getAttribute('data-diff-char')).toBe('+')
    expect(line.textContent).toBe('bar')
  })

  it('does not treat non-marker lines as diff lines', () => {
    const [pre, preRef] = makePre([makeLine('= middle', 1)])
    useEcDecorations(preRef, parsedRef({ diff: true })).applyEcDecorations()
    expect(pre.querySelectorAll('.ec-ins, .ec-del').length).toBe(0)
  })
})

describe('useEcDecorations — collapse + annotation interplay', () => {
  it('anchors annotations inside collapsed ranges to the collapse widget', async () => {
    const [pre, preRef] = makePre([
      makeLine('a', 1),
      makeLine('b', 2),
      makeLine('c', 3),
      makeLine('d', 4),
    ])
    useEcDecorations(preRef, parsedRef({
      collapseRanges: [{ start: 1, end: 3 }],
      annotations: [{ text: 'note', lines: [2, 3] }],
    })).applyEcDecorations()

    const code = pre.querySelector('code')!
    const container = code.querySelector('.ec-collapse-range') as HTMLElement
    const firstChild = container.firstElementChild as HTMLElement
    expect(firstChild.classList.contains('ec-annotation-row')).toBe(true)
    expect(firstChild.textContent).toBe('note')
    const widget = [...container.querySelectorAll('span.ec-collapse-widget')]
    expect(widget.length).toBe(1)
  })
})
