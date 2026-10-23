// @vitest-environment happy-dom
import type { GuideStoreMock } from './__tests__/harness'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { nextTick } from 'vue'
import { installHarness, uiButtonStub } from './__tests__/harness'
import ButtonShowSolution from './ButtonShowSolution.vue'

function mountButton(props: Record<string, unknown> = {}) {
  return mount(ButtonShowSolution, { props, global: { stubs: { UiButton: uiButtonStub } } })
}

describe('button-show-solution', () => {
  let guide: GuideStoreMock
  let harness: ReturnType<typeof installHarness>

  beforeEach(() => {
    harness = installHarness({
      guide: { currentGuide: { solutions: { 'app.vue': '<template/>' } } },
    })
    guide = harness.guide
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('hides the button when there is no guide', () => {
    vi.unstubAllGlobals()
    installHarness({ guide: { currentGuide: undefined } })
    const wrapper = mountButton()
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('hides the button when the guide has no solutions', () => {
    vi.unstubAllGlobals()
    installHarness({ guide: { currentGuide: { solutions: undefined } } })
    const wrapper = mountButton()
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('renders the button and shows the solution message by default', async () => {
    const wrapper = mountButton()
    await nextTick()
    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.find('button').text()).toBe('Show solution')
    expect(wrapper.find('[i-carbon-idea]').exists()).toBe(true)
  })

  it('prefers the showSolutionMessage prop over the store message', async () => {
    const wrapper = mountButton({ showSolutionMessage: 'Reveal answer' })
    await nextTick()
    expect(wrapper.find('button').text()).toBe('Reveal answer')
  })

  it('swaps to the reset message and icon while the solution is showing', async () => {
    const wrapper = mountButton()
    guide.showingSolution = true
    await nextTick()
    expect(wrapper.find('button').text()).toBe('Reset challenge')
    expect(wrapper.find('[i-carbon-rotate-360]').exists()).toBe(true)
  })

  it('prefers the resetMessage prop while showing', async () => {
    const wrapper = mountButton({ resetMessage: 'Hide answer' })
    guide.showingSolution = true
    await nextTick()
    expect(wrapper.find('button').text()).toBe('Hide answer')
  })

  it('calls toggleSolutions on click', async () => {
    const wrapper = mountButton()
    await wrapper.find('button').trigger('click')
    await nextTick()
    expect(guide.toggleSolutions).toHaveBeenCalledTimes(1)
  })

  it('confirms a plain-lesson swap before replacing the editor contents', async () => {
    const wrapper = mountButton()
    await wrapper.find('button').trigger('click')
    await nextTick()
    expect(harness.unsavedChanges.confirmOrDiscard).toHaveBeenCalledTimes(1)
  })

  it('does not swap when the user cancels the confirmation', async () => {
    harness.unsavedChanges.confirmOrDiscard.mockResolvedValueOnce(false)
    const wrapper = mountButton()
    await wrapper.find('button').trigger('click')
    await nextTick()
    expect(harness.unsavedChanges.confirmOrDiscard).toHaveBeenCalledTimes(1)
    expect(guide.toggleSolutions).not.toHaveBeenCalled()
  })

  it('does not confirm for a challenge solution peek', async () => {
    vi.unstubAllGlobals()
    const challengeHarness = installHarness({
      guide: { currentGuide: { solutions: { 'app.vue': '<template/>' }, validation: { challenge: 'x' } } },
    })
    const wrapper = mountButton()
    await wrapper.find('button').trigger('click')
    await nextTick()
    expect(challengeHarness.unsavedChanges.confirmOrDiscard).not.toHaveBeenCalled()
    expect(challengeHarness.guide.toggleSolutions).toHaveBeenCalledTimes(1)
  })
})
