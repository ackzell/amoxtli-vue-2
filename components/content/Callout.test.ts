// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { installHarness } from './__tests__/harness'
import Callout from './Callout.vue'
import Info from './Info.vue'
import Note from './Note.vue'
import Success from './Success.vue'
import Tip from './Tip.vue'
import Warn from './Warn.vue'

function mountCallout(type?: string, slot = '<p>hello</p>') {
  return mount(Callout, {
    props: type ? { type } : {},
    slots: { default: slot },
  })
}

describe('callout', () => {
  beforeEach(() => {
    installHarness()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('defaults to the info variant when no type is given', () => {
    const wrapper = mountCallout()
    const root = wrapper.find('div').element
    expect(root.className).toContain('bg-info/8')
    expect(root.className).toContain('border-info')
    expect(root.className).toContain('text-info-700')
    expect(root.className).toContain('dark:text-info-400')
    expect(wrapper.find('.i-mynaui-info-hexagon-solid').exists()).toBe(true)
  })

  it.each([
    ['success', 'positive', 'i-mynaui-check-hexagon-solid'],
    ['info', 'info', 'i-mynaui-info-hexagon-solid'],
    ['challenge', 'challenge', 'i-mynaui-lightning-solid'],
    ['tip', 'tip', 'i-mynaui-sparkles-solid'],
    ['warning', 'warning', 'i-mynaui-danger-hexagon-solid'],
  ] as const)('maps type=%s to color=%s and its icon', (type, color, icon) => {
    const wrapper = mountCallout(type)
    const root = wrapper.find('div').element
    expect(root.className).toContain(`bg-${color}/8`)
    expect(root.className).toContain(`border-${color}`)
    expect(root.className).toContain(`text-${color}-700`)
    expect(wrapper.find(`.${icon}`).exists()).toBe(true)
  })

  it('renders the slot inside the text container', () => {
    const wrapper = mountCallout('tip', '<strong>do this</strong>')
    expect(wrapper.find('.callout-text-container strong').text()).toBe('do this')
  })

  it('marks both decorative icon nodes as aria-hidden', () => {
    const wrapper = mountCallout('warning')
    const icons = wrapper.findAll('[aria-hidden="true"]')
    expect(icons.length).toBe(2)
  })
})

describe('callout wrappers', () => {
  beforeEach(() => {
    installHarness()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const CalloutStub = {
    name: 'Callout',
    props: ['type'],
    template: '<div class="callout-stub"><slot /></div>',
  }

  it.each([
    ['Tip', Tip, 'tip'],
    ['Warn', Warn, 'warning'],
    ['Info', Info, 'info'],
    ['Success', Success, 'success'],
  ] as const)('%s forwards the %s type to Callout', (_name, Component, type) => {
    const wrapper = mount(Component as any, {
      slots: { default: '<p>inner</p>' },
      global: { stubs: { Callout: CalloutStub } },
    })
    expect(wrapper.findComponent(CalloutStub).props('type')).toBe(type)
    expect(wrapper.findComponent(CalloutStub).text()).toBe('inner')
  })

  it('note is standalone and does not depend on Callout', () => {
    const wrapper = mount(Note, { slots: { default: '<p>just a note</p>' } })
    expect(wrapper.findComponent({ name: 'Callout' }).exists()).toBe(false)
    expect(wrapper.find('div').attributes('bg-active')).toBeDefined()
    expect(wrapper.text()).toBe('just a note')
  })
})
