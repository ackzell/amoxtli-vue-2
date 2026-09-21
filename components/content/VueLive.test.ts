// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ref } from 'vue'
import { contentMocks, iconButtonStub, installHarness } from './__tests__/harness'
import VueLive from './VueLive.client.vue'

const vl = vi.hoisted(() => {
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
    compileSfc: vi.fn(),
    render: vi.fn(),
    showError: vi.fn(),
    iframeEl: null as null | { value: HTMLIFrameElement | null },
    blobUrl: null as null | { value: string },
  }
})

vi.mock('@shikijs/monaco', () => ({ shikiToMonaco: vi.fn() }))
vi.mock('~/monaco/environment', () => ({ ensureMonacoEnvironment: vi.fn() }))
vi.mock('~/monaco/language-configs', () => ({ vue: {}, html: {} }))
vi.mock('~/monaco/shiki', () => ({ getShiki: vi.fn(async () => ({})) }))

vi.mock('~/composables/useSfcCompiler', () => ({
  useSfcCompiler: () => ({ compileSfc: vl.compileSfc }),
}))

vi.mock('~/composables/useSandboxPreview', () => ({
  useSandboxPreview: () => {
    if (!vl.iframeEl)
      vl.iframeEl = ref(null)
    if (!vl.blobUrl)
      vl.blobUrl = ref('')
    return {
      iframeEl: vl.iframeEl,
      blobUrl: vl.blobUrl,
      render: vl.render,
      showError: vl.showError,
    }
  },
}))

vi.mock('monaco-editor-core/esm/vs/editor/editor.api', () => ({
  editor: { create: vl.create, setTheme: vl.setTheme },
  languages: vl.languages,
}))
vi.mock('monaco-editor-core/esm/vs/editor/contrib/codelens/browser/codeLensCache', () => ({}))
vi.mock('monaco-editor-core/esm/vs/editor/contrib/inlayHints/browser/inlayHintsController', () => ({}))
vi.mock('monaco-editor-core/esm/vs/editor/contrib/suggest/browser/suggestMemory', () => ({}))
vi.mock('monaco-editor-core/esm/vs/platform/actionWidget/browser/actionWidget', () => ({}))
vi.mock('monaco-editor-core/esm/vs/editor/common/services/treeViewsDndService', () => ({}))

const source = '<template><h1>Hello</h1></template>'
const b64 = btoa(source)

function mountLive(props: Record<string, unknown> = {}) {
  return mount(VueLive, {
    props,
    global: { stubs: { IconButton: iconButtonStub }, mocks: contentMocks },
  })
}

function resetMonaco() {
  vl.editor.value = ''
  vl.model.applyEdits.mockReset()
  vl.editor.setHiddenAreas.mockReset()
  vl.create.mockReset()
  vl.setTheme.mockReset()
  vl.compileSfc.mockReset()
  vl.render.mockReset()
  vl.showError.mockReset()
  vl.iframeEl = null
  vl.blobUrl = null
  vl.compileSfc.mockReturnValue({ js: 'const x = 1', css: '.a{color:red}' })
}

describe('vue live', () => {
  let consoleOutput: ReturnType<typeof installHarness>['consoleOutput']
  let colorMode: ReturnType<typeof installHarness>['colorMode']

  beforeEach(() => {
    resetMonaco()
    const harness = installHarness()
    consoleOutput = harness.consoleOutput
    colorMode = harness.colorMode
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders the title, editor container, and preview iframe', async () => {
    const wrapper = mountLive({ code: b64 })
    await flushPromises()
    expect(wrapper.find('.vue-live-block').exists()).toBe(true)
    expect(wrapper.find('.vl-title').text()).toContain('Vue')
    expect(wrapper.find('.vl-editor').exists()).toBe(true)
    expect(wrapper.find('.vl-preview iframe').attributes('title')).toBe('Live Preview')
    expect(wrapper.find('button[aria-label="Reset contents"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="Reload preview"]').exists()).toBe(true)
    expect(wrapper.find('.vl-console').exists()).toBe(false)
  })

  it('decodes the base64 code and boots an editor with the vue language and light theme', async () => {
    mountLive({ code: b64 })
    await flushPromises()
    expect(vl.create).toHaveBeenCalledTimes(1)
    expect(vl.languages.register).toHaveBeenCalledWith({ id: 'vue', extensions: ['.vue'] })
    const options = vl.create.mock.calls[0][1]
    expect(options.value).toBe(source)
    expect(options.language).toBe('vue')
    expect(options.theme).toBe('amoxtli-light')
    expect(options.lineNumbers).toBe('off')
  })

  it('turns line numbers on and uses the vesper theme when dark', async () => {
    installHarness({ colorMode: 'dark' })
    mountLive({ code: b64, showLineNumbers: true })
    await flushPromises()
    const options = vl.create.mock.calls[0][1]
    expect(options.lineNumbers).toBe('on')
    expect(options.theme).toBe('vesper')
  })

  it('compiles and renders the preview on mount', async () => {
    mountLive({ code: b64 })
    await flushPromises()
    expect(vl.compileSfc).toHaveBeenCalledWith(source)
    expect(vl.render).toHaveBeenCalledWith('const x = 1', '.a{color:red}', false, false)
  })

  it('surfaces a compile error through the error overlay', async () => {
    vl.compileSfc.mockReturnValue({ js: '', css: '', error: 'boom' })
    mountLive({ code: b64 })
    await flushPromises()
    expect(vl.render).not.toHaveBeenCalled()
    expect(vl.showError).toHaveBeenCalledWith('boom', '', false)
  })

  it('debounces recompiles on editor content changes', async () => {
    mountLive({ code: b64 })
    await flushPromises()
    vl.compileSfc.mockClear()
    vl.render.mockClear()
    vl.editor.value = 'changed'
    vl.triggerChange()
    expect(vl.compileSfc).not.toHaveBeenCalled()
    await new Promise(resolve => setTimeout(resolve, 350))
    expect(vl.compileSfc).toHaveBeenCalledTimes(1)
    expect(vl.compileSfc).toHaveBeenCalledWith('changed')
    expect(vl.render).toHaveBeenCalledTimes(1)
  })

  it('resets the editor to the original code and recompiles', async () => {
    const wrapper = mountLive({ code: b64 })
    await flushPromises()
    vl.editor.value = 'edited'
    vl.triggerChange()
    await new Promise(resolve => setTimeout(resolve, 350))
    vl.compileSfc.mockClear()
    vl.render.mockClear()

    await wrapper.find('button[aria-label="Reset contents"]').trigger('click')
    expect(vl.model.applyEdits).toHaveBeenCalledTimes(1)
    expect(vl.model.applyEdits).toHaveBeenCalledWith([{ range: {}, text: source }])
    expect(vl.compileSfc).toHaveBeenCalledWith(source)
    expect(vl.render).toHaveBeenCalledTimes(1)
  })

  it('is a no-op when reset is clicked with unmodified contents', async () => {
    const wrapper = mountLive({ code: b64 })
    await flushPromises()
    vl.model.applyEdits.mockClear()
    await wrapper.find('button[aria-label="Reset contents"]').trigger('click')
    expect(vl.model.applyEdits).not.toHaveBeenCalled()
  })

  it('recompiles when the reload button is clicked', async () => {
    const wrapper = mountLive({ code: b64 })
    await flushPromises()
    vl.render.mockClear()
    await wrapper.find('button[aria-label="Reload preview"]').trigger('click')
    expect(vl.compileSfc).toHaveBeenCalledWith(source)
    expect(vl.render).toHaveBeenCalledTimes(1)
  })

  it('wires the console when showConsole is enabled', async () => {
    const wrapper = mountLive({ code: b64, showConsole: true })
    await flushPromises()
    expect(consoleOutput.initConsole).toHaveBeenCalledTimes(1)
    expect(consoleOutput.initConsole.mock.calls[0][0]).toBe(wrapper.find('.vl-console').element)
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
    expect(vl.editor.setHiddenAreas).toHaveBeenCalledWith([
      { startLineNumber: 2, startColumn: 1, endLineNumber: 5, endColumn: 1 },
    ])
  })

  it('re-themes and re-renders when the color mode changes', async () => {
    mountLive({ code: b64 })
    await flushPromises()
    vl.setTheme.mockClear()
    vl.render.mockClear()
    colorMode.value = 'dark'
    await flushPromises()
    expect(vl.setTheme).toHaveBeenCalledWith('vesper')
    expect(vl.render).toHaveBeenCalledWith('const x = 1', '.a{color:red}', true, false)
  })

  it('recompiles once the Vue runtime blob is ready', async () => {
    mountLive({ code: b64 })
    await flushPromises()
    vl.compileSfc.mockClear()
    vl.render.mockClear()
    vl.blobUrl!.value = 'blob:vue-runtime'
    await flushPromises()
    expect(vl.compileSfc).toHaveBeenCalledTimes(1)
    expect(vl.render).toHaveBeenCalledTimes(1)
  })
})
