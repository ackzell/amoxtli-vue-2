// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { contentMocks, installHarness } from './__tests__/harness'
import ContentCard from './ContentCard.vue'

const NuxtLinkStub = {
  name: 'NuxtLink',
  props: ['to'],
  template: '<a :href="typeof to === \'string\' ? to : \'\'"><slot /></a>',
}

function mountCard(props: Record<string, unknown>, slot = '') {
  return mount(ContentCard, {
    props,
    slots: slot ? { default: slot } : undefined,
    global: {
      stubs: { NuxtLink: NuxtLinkStub },
      mocks: contentMocks,
    },
  })
}

describe('content-card', () => {
  beforeEach(() => {
    installHarness()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders title, description, and icon', () => {
    const wrapper = mountCard({
      to: '/lessons/1',
      icon: 'i-mynaui-book',
      title: 'Basics',
      description: 'Intro to Vue',
    })
    expect(wrapper.text()).toContain('Basics')
    expect(wrapper.text()).toContain('Intro to Vue')
    expect(wrapper.find('span.i-mynaui-book').exists()).toBe(true)
  })

  it('wires the NuxtLink to the target', () => {
    const wrapper = mountCard({ to: '/lessons/1', title: 't', description: 'd' })
    expect(wrapper.findComponent(NuxtLinkStub).props('to')).toBe('/lessons/1')
  })

  it('renders extra slot content alongside the description', () => {
    const wrapper = mountCard(
      { to: '/x', title: 't', description: 'd' },
      '<span class="extra">more</span>',
    )
    expect(wrapper.find('.extra').text()).toBe('more')
  })

  it('does not mark a non-wip card as disabled or coming soon', () => {
    const wrapper = mountCard({ to: '/x', title: 't', description: 'd' })
    const root = wrapper.find('div').element
    expect(root.className).not.toContain('op75')
    expect(root.className).not.toContain('pointer-events-none')
    expect(wrapper.text()).not.toContain('coming-soon')
  })

  it('marks a wip card disabled with a coming-soon badge', () => {
    const wrapper = mountCard({ to: '/x', title: 't', description: 'd', wip: true })
    const root = wrapper.find('div').element
    expect(root.className).toContain('op75')
    expect(root.className).toContain('pointer-events-none')
    expect(wrapper.text()).toContain('coming-soon')
  })
})
