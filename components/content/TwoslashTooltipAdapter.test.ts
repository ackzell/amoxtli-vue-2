// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { installHarness, tooltipContentStub, tooltipTriggerStub } from './__tests__/harness'
import TwoslashTooltipAdapter from './TwoslashTooltipAdapter.vue'

function mountAdapter(props: Record<string, unknown>) {
  return mount(TwoslashTooltipAdapter, {
    props,
    global: {
      stubs: {
        TooltipTrigger: tooltipTriggerStub,
        TooltipContent: tooltipContentStub,
      },
    },
  })
}

function trigger(wrapper: ReturnType<typeof mountAdapter>) {
  return wrapper.findComponent({ name: 'TooltipTrigger' })
}

describe('twoslash-tooltip-adapter', () => {
  beforeEach(() => {
    installHarness()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the token html inside the trigger and content inside the popup', () => {
    const wrapper = mountAdapter({
      id: 'tt-1',
      content: '<p>hover <code>text</code></p>',
      tokenHtml: '<b>const</b>',
    })
    expect(wrapper.find('.twoslash-token-content').html()).toContain('<b>const</b>')
    expect(wrapper.find('.twoslash-popup-content').html()).toContain('<p>hover')
  })

  it('wires the id and quiet defaults for an on-demand tooltip', () => {
    const t = trigger(mountAdapter({ id: 'tt-2', content: 'x', tokenHtml: 'y' }))
    expect(t.props('id')).toBe('tt-2')
    expect(t.props('noIcon')).toBe(true)
    expect(t.props('noFollow')).toBe(true)
    expect(t.props('persistent')).toBe(false)
    expect(t.props('defaultShown')).toBe(false)
    expect(t.props('hideTimeout')).toBe(100)
    expect(t.props('placement')).toBeUndefined()
  })

  it('marks persisted tooltips shown and anchored', () => {
    const t = trigger(mountAdapter({
      id: 'tt-3',
      content: 'x',
      tokenHtml: 'y',
      persisted: true,
    }))
    expect(t.props('persistent')).toBe(true)
    expect(t.props('defaultShown')).toBe(true)
    expect(t.props('placement')).toBe('bottom-start')
  })

  it('forwards a custom popper class for completion triggers', () => {
    const t = trigger(mountAdapter({
      id: 'tt-4',
      content: 'x',
      tokenHtml: '<span class="twoslash-completion-caret" />',
      popperClass: 'twoslash-completion-popper',
    }))
    expect(t.props('popperClass')).toBe('twoslash-completion-popper')
  })
})
