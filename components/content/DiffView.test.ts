// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import { contentMocks, installHarness } from './__tests__/harness'
import DiffView from './DiffView.client.vue'

const DiffCodeStub = {
  name: 'DiffCode',
  props: ['oldString', 'newString', 'outputFormat', 'lang', 'maxHeight', 'before', 'after'],
  template: '<div class="diff-code-stub" />',
}

function fence(code: string) {
  const lines = code
    .split('\n')
    .map(line => `<span class="line">${line}</span>`)
    .join('')
  return `<pre><code>${lines}</code></pre>`
}

async function mountView(props: Record<string, unknown> = {}, oldCode = 'a\nb', newCode = 'a\nc') {
  const wrapper = mount(DiffView, {
    props,
    slots: { default: fence(oldCode) + fence(newCode) },
    global: {
      stubs: { DiffCode: DiffCodeStub },
      mocks: contentMocks,
    },
  })
  await nextTick()
  return wrapper
}

function diffCode(wrapper: Awaited<ReturnType<typeof mountView>>) {
  return wrapper.findComponent({ name: 'DiffCode' })
}

describe('diff-view', () => {
  beforeEach(() => {
    installHarness()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reconstructs the two fence blocks into old and new strings', async () => {
    const props = diffCode(await mountView()).props()
    expect(props.oldString).toBe('a\nb')
    expect(props.newString).toBe('a\nc')
  })

  it('falls back to i18n labels for the pane headers', async () => {
    const props = diffCode(await mountView()).props()
    expect(props.before).toBe('Before')
    expect(props.after).toBe('After')
  })

  it('lets explicit labels override the defaults', async () => {
    const props = diffCode(await mountView({ before: 'old.ts', after: 'new.ts' })).props()
    expect(props.before).toBe('old.ts')
    expect(props.after).toBe('new.ts')
  })

  it('defaults to side-by-side and forwards the max height', async () => {
    const props = diffCode(await mountView()).props()
    expect(props.outputFormat).toBe('side-by-side')
    expect(props.maxHeight).toBe('28rem')
  })

  it('honors an explicit output format', async () => {
    const props = diffCode(await mountView({ outputFormat: 'line-by-line' })).props()
    expect(props.outputFormat).toBe('line-by-line')
  })

  it('switches to line-by-line on narrow screens', async () => {
    vi.unstubAllGlobals()
    installHarness({ isNarrow: true })
    const props = diffCode(await mountView()).props()
    expect(props.outputFormat).toBe('line-by-line')
  })

  it('shows the loading placeholder until a fence is parsed', () => {
    const wrapper = mount(DiffView, {
      global: {
        stubs: { DiffCode: DiffCodeStub },
        mocks: contentMocks,
      },
    })
    expect(wrapper.find('.diff-code-stub').exists()).toBe(false)
    expect(wrapper.text()).toContain('Loading…')
  })
})
