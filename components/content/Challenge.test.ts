// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { installHarness } from './__tests__/harness'
import Challenge from './Challenge.vue'

const CalloutStub = {
  name: 'Callout',
  props: ['type'],
  template: '<div class="callout-stub"><slot /></div>',
}

describe('challenge', () => {
  beforeEach(() => {
    installHarness()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('wraps its slot in a challenge callout', () => {
    const wrapper = mount(Challenge, {
      slots: { default: '<p>build a thing</p>' },
      global: { stubs: { Callout: CalloutStub } },
    })
    expect(wrapper.findComponent(CalloutStub).props('type')).toBe('challenge')
    expect(wrapper.findComponent(CalloutStub).text()).toBe('build a thing')
  })

  it('keeps the trailing corners square', () => {
    const wrapper = mount(Challenge, {
      slots: { default: '<p>build a thing</p>' },
      global: { stubs: { Callout: CalloutStub } },
    })
    const callout = wrapper.find('.callout-stub')
    expect(callout.attributes('rounded-br-none')).toBeDefined()
    expect(callout.attributes('rounded-tl-none')).toBeDefined()
  })
})
