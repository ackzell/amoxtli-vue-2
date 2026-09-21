// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import { contentMocks, iconButtonStub, installHarness } from './__tests__/harness'
import ProsePre from './ProsePre.vue'

vi.mock('motion-v', () => ({
  AnimatePresence: { template: '<div><slot /></div>' },
  Motion: { template: '<div><slot /></div>' },
}))

describe('twoslash + annotation coexistence', () => {
  beforeEach(() => {
    installHarness()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('applies annotations while preserving twoslash hover nodes', async () => {
    const wrapper = mount(ProsePre, {
      props: { language: 'ts', meta: '{"note":1}' },
      slots: {
        default: '<code><span class="line" line="1"><span>const </span><span class="twoslash-hover" data-content="<p>type</p>"><b>x</b></span></span></code>',
      },
      global: {
        stubs: { IconButton: iconButtonStub },
        mocks: contentMocks,
      },
    })

    await nextTick()

    const line = wrapper.find('.line[line="1"]').element

    const content = line.querySelector('.ec-annotated-content')
    const twoslash = line.querySelector('.twoslash-hover')

    expect(content).not.toBeNull()
    expect(content!.parentElement).toBe(line)
    expect(content!.querySelector('.twoslash-hover')).toBeNull()
    expect(content!.textContent).toContain('const ')

    expect(twoslash).not.toBeNull()
    expect(twoslash!.parentElement).toBe(line)
    expect(twoslash!.querySelector('.ec-annotated-content')).toBeNull()

    const row = wrapper.find('.ec-annotation-row')
    expect(row.exists()).toBe(true)
    expect(row.text()).toBe('note')
  })
})
