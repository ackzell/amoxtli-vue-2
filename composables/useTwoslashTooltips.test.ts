// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'

import { installHarness } from '../components/content/__tests__/harness'
import { useTwoslashTooltips } from './useTwoslashTooltips'

const Host = defineComponent({
  setup() {
    const el = ref<HTMLElement>()
    useTwoslashTooltips(el)
    return { el }
  },
  template: '<div ref="el"><slot /></div>',
})

function mountHost(inner: string) {
  return mount(Host, {
    slots: { default: inner },
  })
}

describe('use-twoslash-tooltips', () => {
  beforeEach(() => {
    installHarness()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('replaces a hover trigger with a mounted tooltip adapter', async () => {
    const wrapper = mountHost(
      '<span class="twoslash-hover" data-content="<p>pop</p>"><b>tok</b></span>',
    )
    await flushPromises()

    expect(wrapper.find('.twoslash-hover').exists()).toBe(false)
    expect(wrapper.find('.twoslash-mounted').exists()).toBe(true)
    expect(wrapper.find('.twoslash-token-content').html()).toContain('<b>tok</b>')
    expect(wrapper.find('.twoslash-popup-content').html()).toContain('<p>pop</p>')
  })

  it('leaves triggers without data-content untouched', async () => {
    const wrapper = mountHost('<span class="twoslash-hover">plain</span>')
    await flushPromises()

    expect(wrapper.find('.twoslash-mounted').exists()).toBe(false)
    expect(wrapper.find('.twoslash-hover').text()).toBe('plain')
  })

  it('renders the completion caret token and marks the trigger persistent', async () => {
    const wrapper = mountHost(
      '<span class="twoslash-hover twoslash-completion-trigger" data-content="<p>done</p>">com</span>',
    )
    await flushPromises()

    expect(wrapper.find('.twoslash-completion-caret').exists()).toBe(true)
    expect(wrapper.find('.twoslash-mounted').exists()).toBe(true)

    // The adapter renders into the unresolved <tooltiptrigger> element; the
    // element receives the props as attributes we can assert directly.
    const el = wrapper.find('tooltiptrigger').element
    expect(el.hasAttribute('persistent')).toBe(true)
    expect(el.hasAttribute('default-shown')).toBe(true)
    expect(el.getAttribute('popper-class')).toBe('twoslash-completion-popper')
  })

  it('treats query-persisted triggers as shown and persistent', async () => {
    const wrapper = mountHost(
      '<span class="twoslash-hover twoslash-query-persisted" data-content="<p>q</p>"><b>t</b></span>',
    )
    await flushPromises()

    const el = wrapper.find('tooltiptrigger').element
    expect(el.hasAttribute('persistent')).toBe(true)
    expect(el.hasAttribute('default-shown')).toBe(true)
    expect(el.getAttribute('placement')).toBe('bottom-start')
  })

  it('wires every trigger in the container', async () => {
    const wrapper = mountHost(
      '<span class="twoslash-hover" data-content="a">one</span><span class="twoslash-hover" data-content="b">two</span>',
    )
    await flushPromises()

    expect(wrapper.findAll('.twoslash-mounted')).toHaveLength(2)
  })
})
