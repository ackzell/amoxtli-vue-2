// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ref } from 'vue'
import { contentMocks, iconButtonStub, installHarness } from './__tests__/harness'
import HtmlLive from './HtmlLive.client.vue'

const hl = vi.hoisted(() => {
  let changeCb: (() => void) | null = null

  const model = {
    getFullModelRange: vi.fn(() => ({})),
    applyEdits: vi.fn(),
  }
  const editor = {
    value: '',
    getScrollTop: vi.fn(() => 0),
    getScrollHeight: vi.fn(() => 100),
    getLayoutInfo: vi.fn(() => ({ height: 100 })),
    getModel: vi.fn(() => model),
    getValue: vi.fn(() => editor.value),
    getContentHeight: vi.fn(() => 100),
    layout: vi.fn(),
    setHiddenAreas: vi.fn(),
    dispose: vi.fn(),
    onDidChangeModelContent: vi.fn((cb: () => void) => {
      changeCb = cb
      return { dispose: vi.fn() }
    }),
    onDidContentSizeChange: vi.fn(() => ({ dispose: vi.fn() })),
  }
  const languages = {
    register: vi.fn(),
    setLanguageConfiguration: vi.fn(),
  }

  return {
    model,
    editor,
    languages,
    create: vi.fn(() => editor),
    setTheme: vi.fn(),
    triggerChange: () => changeCb?.(),
  }
})

vi.mock('@shikijs/monaco', () => ({ shikiToMonaco: vi.fn() }))
vi.mock('~/monaco/environment', () => ({ ensureMonacoEnvironment: vi.fn() }))
vi.mock('~/monaco/language-configs', () => ({ vue: {}, html: {} }))
vi.mock('~/monaco/shiki', () => ({ getShiki: vi.fn(async () => ({})) }))

vi.mock('monaco-editor-core/esm/vs/editor/editor.api', () => ({
  editor: { create: hl.create, setTheme: hl.setTheme },
  languages: hl.languages,
}))
vi.mock('monaco-editor-core/esm/vs/editor/contrib/codelens/browser/codeLensCache', () => ({}))
vi.mock('monaco-editor-core/esm/vs/editor/contrib/inlayHints/browser/inlayHintsController', () => ({}))
vi.mock('monaco-editor-core/esm/vs/editor/contrib/suggest/browser/suggestMemory', () => ({}))
vi.mock('monaco-editor-core/esm/vs/platform/actionWidget/browser/actionWidget', () => ({}))
vi.mock('monaco-editor-core/esm/vs/editor/common/services/treeViewsDndService', () => ({}))

const source = '<h1>Hello</h1>'
const b64 = btoa(source)
const srcdoc = '<html><body>rendered</body></html>'

function mountLive(props: Record<string, unknown> = {}) {
  return mount(HtmlLive, {
    props,
    global: { stubs: { IconButton: iconButtonStub }, mocks: contentMocks },
  })
}

function resetMonaco() {
  hl.editor.value = ''
  hl.model.applyEdits.mockReset()
  hl.editor.setHiddenAreas.mockReset()
  hl.create.mockReset()
  hl.setTheme.mockReset()
}

function iframeSrcdoc(wrapper: ReturnType<typeof mountLive>) {
  return (wrapper.find('.hl-preview iframe').element as HTMLIFrameElement).srcdoc
}

describe('html live', () => {
  let consoleOutput: ReturnType<typeof installHarness>['consoleOutput']
  let colorMode: ReturnType<typeof installHarness>['colorMode']
  let renderHtml: ReturnType<typeof vi.fn>

  beforeEach(() => {
    resetMonaco()
    const harness = installHarness()
    consoleOutput = harness.consoleOutput
    colorMode = harness.colorMode
    renderHtml = vi.fn(() => srcdoc)
    vi.stubGlobal('useHtmlSandboxPreview', () => ({
      iframeEl: ref(null),
      renderHtml,
      render: vi.fn(),
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders the title, editor container, and preview iframe', async () => {
    const wrapper = mountLive({ code: b64 })
    await flushPromises()
    expect(wrapper.find('.html-live-block').exists()).toBe(true)
    expect(wrapper.find('.hl-title').text()).toContain('HTML')
    expect(wrapper.find('.hl-editor').exists()).toBe(true)
    expect(wrapper.find('.hl-preview iframe').attributes('title')).toBe('Live Preview')
    expect(wrapper.find('button[aria-label="Reset contents"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="Reload preview"]').exists()).toBe(true)
    expect(wrapper.find('.hl-console').exists()).toBe(false)
  })

  it('decodes the base64 code and boots an editor with the html language and light theme', async () => {
    mountLive({ code: b64 })
    await flushPromises()
    expect(hl.create).toHaveBeenCalledTimes(1)
    expect(hl.languages.register).toHaveBeenCalledWith({ id: 'html', extensions: ['.html'] })
    const options = hl.create.mock.calls[0][1]
    expect(options.value).toBe(source)
    expect(options.language).toBe('html')
    expect(options.theme).toBe('amoxtli-light')
    expect(options.lineNumbers).toBe('off')
  })

  it('turns line numbers on and uses the vesper theme when dark', async () => {
    installHarness({ colorMode: 'dark' })
    mountLive({ code: b64, showLineNumbers: true })
    await flushPromises()
    const options = hl.create.mock.calls[0][1]
    expect(options.lineNumbers).toBe('on')
    expect(options.theme).toBe('vesper')
  })

  it('renders the preview srcdoc from the decoded code on mount', async () => {
    const wrapper = mountLive({ code: b64 })
    await flushPromises()
    expect(renderHtml).toHaveBeenCalledWith(source, false)
    expect(iframeSrcdoc(wrapper)).toBe(srcdoc)
  })

  it('debounces re-renders on editor content changes', async () => {
    mountLive({ code: b64 })
    await flushPromises()
    renderHtml.mockClear()
    hl.editor.value = 'changed'
    hl.triggerChange()
    expect(renderHtml).not.toHaveBeenCalled()
    await new Promise(resolve => setTimeout(resolve, 350))
    expect(renderHtml).toHaveBeenCalledTimes(1)
    expect(renderHtml).toHaveBeenCalledWith('changed', false)
  })

  it('resets the editor to the original code and re-renders', async () => {
    const wrapper = mountLive({ code: b64 })
    await flushPromises()
    hl.editor.value = 'edited'
    hl.triggerChange()
    await new Promise(resolve => setTimeout(resolve, 350))
    renderHtml.mockClear()

    await wrapper.find('button[aria-label="Reset contents"]').trigger('click')
    expect(hl.model.applyEdits).toHaveBeenCalledTimes(1)
    expect(hl.model.applyEdits).toHaveBeenCalledWith([{ range: {}, text: source }])
    expect(renderHtml).toHaveBeenCalledWith(source, false)
  })

  it('is a no-op when reset is clicked with unmodified contents', async () => {
    const wrapper = mountLive({ code: b64 })
    await flushPromises()
    hl.model.applyEdits.mockClear()
    await wrapper.find('button[aria-label="Reset contents"]').trigger('click')
    expect(hl.model.applyEdits).not.toHaveBeenCalled()
  })

  it('re-renders when the reload button is clicked', async () => {
    const wrapper = mountLive({ code: b64 })
    await flushPromises()
    renderHtml.mockClear()
    await wrapper.find('button[aria-label="Reload preview"]').trigger('click')
    expect(renderHtml).toHaveBeenCalledWith(source, false)
  })

  it('wires the console when showConsole is enabled', async () => {
    const wrapper = mountLive({ code: b64, showConsole: true })
    await flushPromises()
    expect(consoleOutput.initConsole).toHaveBeenCalledTimes(1)
    expect(consoleOutput.initConsole.mock.calls[0][0]).toBe(wrapper.find('.hl-console').element)
    expect(wrapper.find('button[aria-label="Clear console"]').exists()).toBe(true)
  })

  it('clears the console logs when the clear button is clicked', async () => {
    const wrapper = mountLive({ code: b64, showConsole: true })
    await flushPromises()
    await wrapper.find('button[aria-label="Clear console"]').trigger('click')
    expect(consoleOutput.clearLogs).toHaveBeenCalledTimes(1)
  })

  it('applies hidden areas from the hide prop', async () => {
    mountLive({ code: b64, hide: '2-5' })
    await flushPromises()
    expect(hl.editor.setHiddenAreas).toHaveBeenCalledWith([
      { startLineNumber: 2, startColumn: 1, endLineNumber: 5, endColumn: 1 },
    ])
  })

  it('re-renders in the new theme when the color mode changes', async () => {
    mountLive({ code: b64 })
    await flushPromises()
    hl.setTheme.mockClear()
    renderHtml.mockClear()
    colorMode.value = 'dark'
    await flushPromises()
    expect(hl.setTheme).toHaveBeenCalledWith('vesper')
    expect(renderHtml).toHaveBeenCalledWith(source, true)
  })
})
