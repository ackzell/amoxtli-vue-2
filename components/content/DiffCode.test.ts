// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { contentMocks, installHarness } from './__tests__/harness'
import DiffCode from './DiffCode.vue'

const h = vi.hoisted(() => ({
  useDiffHighlighter: vi.fn(),
  codeToTokens: vi.fn(),
}))

vi.mock('~/composables/useDiffHighlighter', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../composables/useDiffHighlighter')>()
  return { ...original, useDiffHighlighter: h.useDiffHighlighter }
})

function oneTokenPerLine(code: string, theme: string) {
  return {
    fg: theme === 'vesper' ? '#f8f8f2' : '#24292e',
    tokens: code.split('\n').map(line => [{ content: line, offset: 0, color: '#abcdef' }]),
  }
}

function mountDiff(props: Record<string, unknown>) {
  return mount(DiffCode, {
    props,
    global: { mocks: contentMocks },
  })
}

describe('diff-code', () => {
  beforeEach(() => {
    installHarness()
    h.useDiffHighlighter.mockResolvedValue({ codeToTokens: h.codeToTokens })
    h.codeToTokens.mockImplementation((code: string, opts: { theme: string }) =>
      oneTokenPerLine(code, opts.theme))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetAllMocks()
  })

  it('shows a loading placeholder until the highlighter resolves', async () => {
    h.useDiffHighlighter.mockReturnValue(new Promise(() => {}))
    const wrapper = mountDiff({ oldString: 'a', newString: 'b' })
    await flushPromises()
    expect(wrapper.find('.diff-loading').text()).toBe('Loading…')
    expect(wrapper.find('table').exists()).toBe(false)
  })

  it('renders a side-by-side table with both pane labels by default', async () => {
    const wrapper = mountDiff({
      oldString: 'const x = 1',
      newString: 'const x = 1',
      before: 'old.ts',
      after: 'new.ts',
    })
    await flushPromises()
    expect(wrapper.find('table thead tr.diff-header-row').exists()).toBe(true)
    expect(wrapper.findAll('th[scope="col"]').map(l => l.text())).toEqual(['old.ts', 'new.ts'])
    expect(wrapper.find('.diff-file-label-after').exists()).toBe(true)
    expect(wrapper.find('table[role="grid"]').exists()).toBe(false)
  })

  it('renders line-by-line when forced, with the arrow header', async () => {
    const wrapper = mountDiff({ oldString: 'a', newString: 'b', outputFormat: 'line-by-line' })
    await flushPromises()
    expect(wrapper.find('.diff-file-label-stack').exists()).toBe(true)
    expect(wrapper.find('.diff-file-arrow').exists()).toBe(true)
    expect(wrapper.find('.diff-file-label-after').exists()).toBe(false)
  })

  it('marks removed and added lines with gutter classes and markers', async () => {
    const wrapper = mountDiff({ oldString: 'const x = 1', newString: 'const y = 1' })
    await flushPromises()
    expect(wrapper.find('.line-del').exists()).toBe(true)
    expect(wrapper.find('.line-add').exists()).toBe(true)
    expect(wrapper.find('.line-del-marker').exists()).toBe(true)
    expect(wrapper.find('.line-add-marker').exists()).toBe(true)
  })

  it('splits changed tokens at word-diff boundaries', async () => {
    const wrapper = mountDiff({ oldString: 'const x = 1', newString: 'const y = 1' })
    await flushPromises()
    expect(wrapper.find('.word-del').exists()).toBe(true)
    expect(wrapper.find('.word-add').exists()).toBe(true)
  })

  it('colors token spans from the highlighter', async () => {
    const wrapper = mountDiff({ oldString: 'const x = 1', newString: 'const x = 1' })
    await flushPromises()
    const tok = wrapper.find('.diff-tok')
    expect(tok.attributes('style')).toContain('color: #abcdef')
  })

  it('uses the dark theme fg when color mode is dark', async () => {
    vi.unstubAllGlobals()
    installHarness({ colorMode: 'dark' })
    mountDiff({ oldString: 'const x = 1', newString: 'const x = 1' })
    await flushPromises()
    expect(h.codeToTokens).toHaveBeenCalledWith('const x = 1', { lang: 'text', theme: 'vesper' })
  })

  it('normalizes common extensions to shiki languages', async () => {
    mountDiff({ oldString: 'a', newString: 'b', lang: 'vue' })
    await flushPromises()
    expect(h.codeToTokens).toHaveBeenCalledWith('a', { lang: 'vue', theme: 'amoxtli-light' })
  })
})
