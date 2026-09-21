// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import {
  contentMocks,
  iconButtonStub,
  installHarness,
} from './__tests__/harness'
import ProsePre from './ProsePre.vue'
import ProsePreCollapseAllButton from './ProsePreCollapseAllButton.vue'
import ProsePreCopyButton from './ProsePreCopyButton.vue'
import ProsePreDecreaseFontSizeButton from './ProsePreDecreaseFontSizeButton.vue'
import ProsePreHeader from './ProsePreHeader.vue'
import ProsePreIncreaseFontSizeButton from './ProsePreIncreaseFontSizeButton.vue'

vi.mock('motion-v', () => ({
  AnimatePresence: { name: 'AnimatePresence', template: '<div><slot /></div>' },
  Motion: {
    name: 'Motion',
    props: ['as', 'initial', 'animate', 'exit', 'transition'],
    template: '<div><slot /></div>',
  },
}))

const fenceComponents = {
  ProsePreHeader,
  ProsePreCollapseAllButton,
  ProsePreDecreaseFontSizeButton,
  ProsePreIncreaseFontSizeButton,
  ProsePreCopyButton,
}

function mountPre(props: Record<string, unknown>, text = 'const x = 1') {
  return mount(ProsePre, {
    props,
    slots: { default: `<code><span class="line" line="1">${text}</span></code>` },
    global: {
      components: fenceComponents,
      stubs: { IconButton: iconButtonStub },
      mocks: contentMocks,
    },
  })
}

describe('prose-pre — root chrome', () => {
  beforeEach(() => {
    installHarness()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('marks plain text fences and hides their line numbers', () => {
    const pre = mountPre({ language: 'text' }).find('pre')
    expect(pre.classes()).toContain('ec-plain-text')
    expect(pre.classes()).toContain('ec-hide-line-numbers')
  })

  it('keeps line numbers for language fences by default', () => {
    const pre = mountPre({ language: 'ts' }).find('pre')
    expect(pre.classes()).not.toContain('ec-plain-text')
    expect(pre.classes()).not.toContain('ec-hide-line-numbers')
  })

  it('honors showLineNumbers=false', () => {
    const pre = mountPre({ language: 'ts', meta: 'showLineNumbers=false' }).find('pre')
    expect(pre.classes()).toContain('ec-hide-line-numbers')
    expect(pre.classes()).not.toContain('ec-plain-text')
  })

  it('flags inline diffs', () => {
    const pre = mountPre({ language: 'vue', meta: 'diff' }).find('pre')
    expect(pre.classes()).toContain('ec-diff')
  })

  it('renders a filename header and icon derived from the title', () => {
    const wrapper = mountPre({ language: 'ts', meta: 'title="hello.ts"' })
    const header = wrapper.findComponent(ProsePreHeader)
    expect(header.exists()).toBe(true)
    expect(header.text()).toContain('hello.ts')
    expect(header.find('.i-logos-typescript-icon').exists()).toBe(true)
    expect(wrapper.find('pre').classes()).toContain('rounded-t-none!')
  })

  it('picks the vue icon for .vue extensions', () => {
    const wrapper = mountPre({ language: 'ts', meta: 'title="App.vue"' })
    expect(wrapper.findComponent(ProsePreHeader).find('.i-logos-vue').exists()).toBe(true)
  })

  it('does not render a header without a filename', () => {
    const wrapper = mountPre({ language: 'ts' })
    expect(wrapper.findComponent(ProsePreHeader).exists()).toBe(false)
    expect(wrapper.find('pre').classes()).not.toContain('rounded-t-none!')
  })
})

describe('prose-pre — chrome wiring', () => {
  let copy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    copy = installHarness().copy
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('copies the code prop on copy click', async () => {
    const wrapper = mountPre({ language: 'ts', code: 'const answer = 42' })
    await wrapper.find('button[aria-label="Copy code"]').trigger('click')
    await nextTick()
    expect(copy).toHaveBeenCalledWith('const answer = 42')
  })

  it('falls back to the rendered text when no code prop is given', async () => {
    const wrapper = mountPre({ language: 'ts' })
    await wrapper.find('button[aria-label="Copy code"]').trigger('click')
    await nextTick()
    expect(copy).toHaveBeenCalledWith('const x = 1')
  })

  it('steps the font size up and down two pixels', async () => {
    const wrapper = mountPre({ language: 'ts' })
    const pre = wrapper.find('pre').element as HTMLElement
    pre.style.fontSize = '16px'

    await wrapper.find('button[aria-label="Increase font size"]').trigger('click')
    expect(pre.style.fontSize).toBe('18px')

    await wrapper.find('button[aria-label="Decrease font size"]').trigger('click')
    expect(pre.style.fontSize).toBe('16px')
  })

  it('expands then collapses collapse ranges through the all button', async () => {
    const wrapper = mountPre({ language: 'ts', meta: 'collapse={2-4}' })
    await nextTick()
    const toggle = wrapper.find('button[aria-label="Toggle all code sections"]')
    expect(toggle.exists()).toBe(true)
    await toggle.trigger('click')
    expect(toggle.find('.i-mynaui-chevron-down').exists()).toBe(true)
    await toggle.trigger('click')
    expect(toggle.find('.i-mynaui-chevron-right').exists()).toBe(true)
  })
})

describe('prose-pre chrome buttons — isolated', () => {
  const mountOpts = {
    global: {
      stubs: { IconButton: iconButtonStub },
      mocks: contentMocks,
    },
  }

  beforeEach(() => {
    installHarness()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('collapse-all emits expand then collapse, and hides without ranges', async () => {
    const wrapper = mount(ProsePreCollapseAllButton, { props: { hasRanges: true }, ...mountOpts })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('expandAll')).toHaveLength(1)
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('collapseAll')).toHaveLength(1)

    const none = mount(ProsePreCollapseAllButton, { props: { hasRanges: false }, ...mountOpts })
    expect(none.find('button').exists()).toBe(false)
  })

  it('copy button swaps label and status when copied', () => {
    const idle = mount(ProsePreCopyButton, { props: { copied: false }, ...mountOpts })
    expect(idle.find('button').attributes('aria-label')).toBe('Copy code')

    const done = mount(ProsePreCopyButton, { props: { copied: true }, ...mountOpts })
    expect(done.find('button').attributes('aria-label')).toBe('Copied!')
    expect(done.find('[role="status"]').text()).toBe('Copied!')
  })

  it('copy button emits copy on click', async () => {
    const wrapper = mount(ProsePreCopyButton, { props: { copied: false }, ...mountOpts })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('copy')).toHaveLength(1)
  })

  it('font size buttons emit their events', async () => {
    const inc = mount(ProsePreIncreaseFontSizeButton, mountOpts)
    await inc.find('button').trigger('click')
    expect(inc.emitted('increaseFontSize')).toHaveLength(1)

    const dec = mount(ProsePreDecreaseFontSizeButton, mountOpts)
    await dec.find('button').trigger('click')
    expect(dec.emitted('decreaseFontSize')).toHaveLength(1)
  })
})
