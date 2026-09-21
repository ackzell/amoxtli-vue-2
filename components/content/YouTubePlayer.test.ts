// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { contentMocks, installHarness } from './__tests__/harness'
import YouTubePlayer from './YouTubePlayer.vue'

function mountPlayer(props: Record<string, unknown>, slot = '') {
  return mount(YouTubePlayer, {
    props,
    slots: slot ? { default: slot } : undefined,
    global: { mocks: contentMocks },
  })
}

describe('youtube-player fallback', () => {
  beforeEach(() => {
    installHarness()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the fallback card instead of an iframe under vitest', () => {
    const wrapper = mountPlayer({ videoId: 'abc123', title: 'A video' })
    expect(wrapper.find('iframe').exists()).toBe(false)
    expect(wrapper.find('h4').text()).toBe('A video')
  })

  it('links to the plain watch URL with a new-tab target', () => {
    const wrapper = mountPlayer({ videoId: 'abc123', title: 'A video' })
    const link = wrapper.find('a')
    expect(link.attributes('href')).toBe('https://www.youtube.com/watch?v=abc123')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
  })

  it('appends the duration to the watch label', () => {
    const wrapper = mountPlayer({ videoId: 'abc', title: 'v', duration: '11:03min' })
    expect(wrapper.find('a').text()).toContain('(11:03min)')
  })

  it('uses the slot as the description when provided', () => {
    const wrapper = mountPlayer(
      { videoId: 'abc', title: 'v' },
      '<em>custom blurb</em>',
    )
    expect(wrapper.find('p em').text()).toBe('custom blurb')
  })

  it('falls back to the i18n description placeholder without a slot', () => {
    const wrapper = mountPlayer({ videoId: 'abc', title: 'v' })
    expect(wrapper.find('p').text()).toBe('Video placeholder')
  })

  it('marks the decorative icon aria-hidden', () => {
    const wrapper = mountPlayer({ videoId: 'abc', title: 'v' })
    expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(true)
  })
})
