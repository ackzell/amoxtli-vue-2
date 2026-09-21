// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { contentMocks, iconButtonStub, installHarness } from './__tests__/harness'
import MagicMove from './MagicMove.client.vue'

vi.mock('@shikijs/magic-move/vue', () => ({
  ShikiMagicMove: {
    name: 'ShikiMagicMove',
    props: ['code', 'lang', 'theme', 'highlighter', 'options'],
    template: '<pre class="shiki-pre"><code>{{ code }}</code></pre>',
  },
}))

const CopyButtonStub = {
  name: 'ProsePreCopyButton',
  props: ['copied'],
  emits: ['copy'],
  template: '<button class="copy-btn" @click="$emit(\'copy\')" />',
}
const IncreaseStub = {
  name: 'ProsePreIncreaseFontSizeButton',
  emits: ['increaseFontSize'],
  template: '<button class="inc-btn" @click="$emit(\'increaseFontSize\')" />',
}
const DecreaseStub = {
  name: 'ProsePreDecreaseFontSizeButton',
  emits: ['decreaseFontSize'],
  template: '<button class="dec-btn" @click="$emit(\'decreaseFontSize\')" />',
}

function stepFence(code: string, filename?: string) {
  const lines = code.split('\n').map(l => `<span class="line">${l}</span>`).join('')
  const label = filename ? `<span data-filename>${filename}</span>` : ''
  return `${label}<pre><code>${lines}</code></pre>`
}

function mountMagic(slot: string, props: Record<string, unknown> = {}) {
  return mount(MagicMove, {
    props,
    slots: { default: slot },
    global: {
      stubs: {
        IconButton: iconButtonStub,
        ProsePreCopyButton: CopyButtonStub,
        ProsePreIncreaseFontSizeButton: IncreaseStub,
        ProsePreDecreaseFontSizeButton: DecreaseStub,
      },
      mocks: contentMocks,
    },
  })
}

const threeSteps = stepFence('const a = 1', 'Step 1')
  + stepFence('const a = 2', 'Step 2')
  + stepFence('const a = 3', 'Step 3')

describe('magic-move', () => {
  let copy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.stubGlobal('useMagicMoveHighlighter', async () => ({}))
    copy = installHarness().copy
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetAllMocks()
  })

  it('shows a loading placeholder until the highlighter resolves', async () => {
    vi.stubGlobal('useMagicMoveHighlighter', () => new Promise(() => {}))
    const wrapper = mountMagic(threeSteps)
    await flushPromises()
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Loading…')
  })

  it('renders one tab per step with the correct ARIA wiring', async () => {
    const wrapper = mountMagic(threeSteps)
    await flushPromises()
    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs).toHaveLength(3)
    expect(tabs.map(t => t.text())).toEqual(['1', '2', '3'])
    expect(tabs[0].attributes('aria-selected')).toBe('true')
    expect(tabs[1].attributes('aria-selected')).toBe('false')
    expect(tabs[0].attributes('tabindex')).toBe('0')
    expect(tabs[1].attributes('tabindex')).toBe('-1')
    expect(wrapper.find('[role="tablist"]').attributes('aria-label')).toBe('Code steps')
  })

  it('disables the previous button on the first step and next on the last', async () => {
    const wrapper = mountMagic(threeSteps)
    await flushPromises()
    const prev = wrapper.findAll('button[aria-label="Previous step"]')
    const next = wrapper.findAll('button[aria-label="Next step"]')
    expect(prev.length).toBeGreaterThan(0)
    expect(prev[0].attributes('disabled')).toBeDefined()
    expect(next[0].attributes('disabled')).toBeUndefined()
  })

  it('advances and retreats through the prev/next buttons', async () => {
    const wrapper = mountMagic(threeSteps)
    await flushPromises()
    const next = wrapper.findAll('button[aria-label="Next step"]')
    await next[0].trigger('click')
    expect(wrapper.find('[role="status"]').text()).toContain('2/ 3')
    const prev = wrapper.findAll('button[aria-label="Previous step"]')
    await prev[0].trigger('click')
    expect(wrapper.find('[role="status"]').text()).toContain('1/ 3')
  })

  it('jumps to a step via its pill', async () => {
    const wrapper = mountMagic(threeSteps)
    await flushPromises()
    const tabs = wrapper.findAll('[role="tab"]')
    await tabs[2].trigger('click')
    expect(tabs[2].attributes('aria-selected')).toBe('true')
    expect(wrapper.find('[role="status"]').text()).toContain('3/ 3')
  })

  it('navigates with arrow keys on the container', async () => {
    const wrapper = mountMagic(threeSteps)
    await flushPromises()
    const container = wrapper.find('.magic-move-slot-container')
    await container.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.find('[role="status"]').text()).toContain('2/ 3')
    await container.trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.find('[role="status"]').text()).toContain('1/ 3')
  })

  it('wraps arrow navigation in the tablist', async () => {
    const wrapper = mountMagic(threeSteps)
    await flushPromises()
    const tablist = wrapper.find('[role="tablist"]')
    await tablist.trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.find('[role="status"]').text()).toContain('3/ 3')
    await tablist.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.find('[role="status"]').text()).toContain('1/ 3')
  })

  it('copies the current step code', async () => {
    const wrapper = mountMagic(threeSteps)
    await flushPromises()
    await wrapper.find('.copy-btn').trigger('click')
    expect(copy).toHaveBeenCalledWith('const a = 1')
  })

  it('steps the font size up and down', async () => {
    const wrapper = mountMagic(threeSteps)
    await flushPromises()
    const pre = wrapper.find('.shiki-pre').element as HTMLElement
    pre.style.fontSize = '16px'

    await wrapper.find('.inc-btn').trigger('click')
    expect(pre.style.fontSize).toBe('18px')
    await wrapper.find('.dec-btn').trigger('click')
    expect(pre.style.fontSize).toBe('16px')
  })

  it('uses the dark theme when color mode is dark', async () => {
    installHarness({ colorMode: 'dark' })
    const wrapper = mountMagic(threeSteps)
    await flushPromises()
    const shiki = wrapper.findComponent({ name: 'ShikiMagicMove' })
    expect(shiki.props('theme')).toBe('vesper')
  })
})
