// @vitest-environment happy-dom
import type { ChallengeCheckResult } from '~/types/validation'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { computed, nextTick, ref } from 'vue'
import { contentMocks, installHarness } from './__tests__/harness'
import ChallengeCheck from './ChallengeCheck.vue'

const vc = vi.hoisted(() => ({
  status: 'idle' as 'idle' | 'pass' | 'fail',
  results: [] as ChallengeCheckResult[],
  passed: false,
  computing: false,
  completed: false,
  runValidation: vi.fn(async () => true),
  reset: vi.fn(),
  loadGuideMeta: vi.fn(async () => undefined as unknown),
  recordAttempt: vi.fn(async () => {}),
}))

vi.mock('~/composables/useChallengeValidation', () => ({
  useChallengeValidation: () => ({
    status: ref(vc.status),
    results: ref(vc.results),
    passed: computed(() => vc.passed),
    computing: ref(vc.computing),
    runValidation: vc.runValidation,
    reset: vc.reset,
  }),
}))

vi.mock('~/composables/useChallengeProgress', () => ({
  useChallengeProgress: () => ({
    isCompleted: () => vc.completed,
  }),
}))

vi.mock('~/composables/useGuideMeta', () => ({
  loadGuideMeta: (...args: unknown[]) => vc.loadGuideMeta(...args),
}))

vi.mock('~/db/challenges', () => ({
  challenges: { recordAttempt: (...args: unknown[]) => vc.recordAttempt(...args) },
}))

function mountCheck(guideOverrides: Record<string, unknown> = {}) {
  const harness = installHarness({
    routePath: '/en/basics/challenge',
    guide: {
      currentGuide: { validation: {}, sessionName: 'basics-challenge', template: 'vue' },
      ...guideOverrides,
    },
  })
  const wrapper = mount(ChallengeCheck, { global: { mocks: contentMocks } })
  return { wrapper, guide: harness.guide }
}

describe('challenge check', () => {
  beforeEach(() => {
    vc.status = 'idle'
    vc.results = []
    vc.passed = false
    vc.computing = false
    vc.completed = false
    vc.runValidation.mockReset()
    vc.runValidation.mockImplementation(async () => true)
    vc.reset.mockReset()
    vc.loadGuideMeta.mockReset()
    vc.loadGuideMeta.mockResolvedValue(undefined)
    vc.recordAttempt.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders nothing when the guide has no validation', () => {
    const { wrapper } = mountCheck({ currentGuide: {} })
    expect(wrapper.find('.challenge-client').exists()).toBe(false)
  })

  it('runs the validation suite when check is clicked', async () => {
    const { wrapper } = mountCheck()
    const button = wrapper.find('button')
    expect(button.text()).toContain('Check my work')
    await button.trigger('click')
    expect(vc.runValidation).toHaveBeenCalledTimes(1)
  })

  it('surfaces a failed check with its details and status summary', () => {
    vc.status = 'fail'
    vc.results = [
      { name: 'Renders greeting', passed: false, message: 'expected an h1', hint: 'Add an h1' },
    ]
    const { wrapper } = mountCheck()
    expect(wrapper.find('[data-testid="challenge-status-summary"]').text()).toBe('0/1')
    expect(wrapper.text()).toContain('Not quite — see the details below')
    expect(wrapper.text()).toContain('Renders greeting')
    expect(wrapper.text()).toContain('Add an h1')
    expect(wrapper.text()).toContain('expected an h1')
    expect(wrapper.find('.i-mynaui-x-solid').exists()).toBe(true)
  })

  it('surfaces a passed check as completed', () => {
    vc.status = 'pass'
    vc.passed = true
    vc.completed = true
    vc.results = [{ name: 'Renders greeting', passed: true, message: '' }]
    const { wrapper } = mountCheck()
    expect(wrapper.text()).toContain('You\'ve completed this challenge')
    expect(wrapper.text()).toContain('Passed!')
    expect(wrapper.find('[data-testid="challenge-status-summary"]').text()).toBe('1/1')
    expect(wrapper.find('.i-mynaui-check-solid').exists()).toBe(true)
  })

  it('marks the widget busy and disables the button while computing', () => {
    vc.computing = true
    const { wrapper } = mountCheck()
    const button = wrapper.find('button')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.text()).toContain('Checking…')
    expect(wrapper.find('.challenge-client').attributes('aria-busy')).toBe('true')
  })

  it('disables check while the solution is showing', () => {
    const { wrapper } = mountCheck({ showingSolution: true })
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })

  it('resets, remounts, and records an attempt when retaking a completed challenge', async () => {
    vc.completed = true
    vc.loadGuideMeta.mockResolvedValue({})
    const { wrapper, guide } = mountCheck()
    const retake = wrapper.find('button')
    expect(retake.text()).toContain('Retake challenge')
    await retake.trigger('click')
    expect(vc.reset).toHaveBeenCalledTimes(1)
    expect(vc.loadGuideMeta).toHaveBeenCalledWith('/en/basics/challenge')
    expect(guide.mount).toHaveBeenCalledWith({}, false)
    expect(vc.recordAttempt).toHaveBeenCalledWith('basics-challenge')
    await nextTick()
    expect(wrapper.find('button').text()).toContain('Check my work')
  })
})
