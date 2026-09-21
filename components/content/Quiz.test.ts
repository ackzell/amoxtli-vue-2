// @vitest-environment happy-dom
import type { ResolvedQuiz } from '~/types/quiz'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { nextTick, ref } from 'vue'
import { contentMocks, installHarness } from './__tests__/harness'
import Quiz from './Quiz.vue'

const mockData = vi.hoisted(() => ({
  quiz: null as ResolvedQuiz | null,
  completed: false,
  bestScore: undefined as number | undefined,
  recordPass: vi.fn(async () => {}),
  recordAttempt: vi.fn(async () => {}),
}))

vi.mock('~/composables/useQuiz', async (importOriginal) => {
  const original = await importOriginal<typeof import('../composables/useQuiz')>()
  return { ...original, useQuiz: () => ({ data: ref(mockData.quiz) }) }
})

vi.mock('~/composables/useQuizProgress', () => ({
  useQuizProgress: () => ({
    isCompleted: () => mockData.completed,
    bestScore: () => mockData.bestScore,
  }),
}))

vi.mock('~/db/quizzes', () => ({
  quizzes: { recordPass: mockData.recordPass, recordAttempt: mockData.recordAttempt },
}))

function freshQuiz(): ResolvedQuiz {
  return {
    id: 'checkpoint',
    title: 'Checkpoint',
    passThreshold: 100,
    feedback: 'submit',
    questions: [
      {
        id: 'sum',
        type: 'mcq',
        prompt: 'What is 2+2?',
        options: [
          { id: 'two', label: 'Two' },
          { id: 'four', label: 'Four' },
        ],
        answer: ['four'],
        explanation: 'Two plus two equals four.',
      },
      {
        id: 'reactive',
        type: 'tf',
        prompt: 'Is ref() reactive?',
        options: [
          { id: 'true', label: 'True' },
          { id: 'false', label: 'False' },
        ],
        answer: ['true'],
      },
    ],
  }
}

const MDCStub = {
  name: 'MDC',
  props: { value: String, tag: String, unwrap: String },
  template: '<span>{{ value }}</span>',
}

function mountQuiz(props: Record<string, unknown> = {}) {
  return mount(Quiz, {
    props: { id: 'checkpoint', ...props },
    global: { stubs: { MDC: MDCStub }, mocks: contentMocks },
  })
}

function clickOption(wrapper: ReturnType<typeof mountQuiz>, label: string) {
  const opt = wrapper.findAll('label').find(l => l.text().includes(label))!
  return opt.find('input').setValue(true)
}

describe('quiz component', () => {
  beforeEach(() => {
    installHarness()
    mockData.quiz = freshQuiz()
    mockData.completed = false
    mockData.bestScore = undefined
    mockData.recordPass.mockClear()
    mockData.recordAttempt.mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('falls back to the check-title when the quiz has no title', () => {
    mockData.quiz = { ...freshQuiz(), title: undefined }
    const wrapper = mountQuiz()
    expect(wrapper.text()).toContain('Check your understanding')
  })

  it('numbers each question and renders its prompt', () => {
    const wrapper = mountQuiz()
    expect(wrapper.text()).toContain('Question 1:')
    expect(wrapper.text()).toContain('Question 2:')
    expect(wrapper.text()).toContain('What is 2+2?')
    expect(wrapper.text()).toContain('Is ref() reactive?')
  })

  it('shows the answer-all hint until every question is answered', async () => {
    const wrapper = mountQuiz()
    expect(wrapper.text()).toContain('Try answering all the questions first')
    expect(wrapper.find('[data-testid="quiz-submit"]').attributes('disabled')).toBeDefined()
    await clickOption(wrapper, 'Four')
    expect(wrapper.text()).toContain('Try answering all the questions first')
    await clickOption(wrapper, 'True')
    expect(wrapper.text()).not.toContain('Try answering all the questions first')
    expect(wrapper.find('[data-testid="quiz-submit"]').attributes('disabled')).toBeUndefined()
  })

  it('reveals answers and best score for an already-completed quiz without submitting', () => {
    mockData.completed = true
    mockData.bestScore = 80
    const wrapper = mountQuiz()
    expect(wrapper.text()).toContain('You\'ve passed this quiz')
    expect(wrapper.find('[data-testid="quiz-submit"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="quiz-best-score"]').text()).toContain('80/100')
    expect(wrapper.findAll('.i-mynaui-check-solid').length).toBe(2)
  })

  it('reveals the explanation after submitting', async () => {
    const wrapper = mountQuiz()
    await clickOption(wrapper, 'Four')
    await clickOption(wrapper, 'True')
    await wrapper.find('[data-testid="quiz-submit"]').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('Explanation')
    expect(wrapper.text()).toContain('Two plus two equals four.')
  })

  it('marks wrong selections incorrect and unselected answers missed after submit', async () => {
    const wrapper = mountQuiz()
    await clickOption(wrapper, 'Two')
    await clickOption(wrapper, 'False')
    await wrapper.find('[data-testid="quiz-submit"]').trigger('click')
    await nextTick()
    const labels = wrapper.findAll('span.sr-only').map(n => n.text())
    expect(labels.filter(t => t === 'Incorrect').length).toBe(2)
    expect(labels.filter(t => t === 'Correct answer — not selected').length).toBe(2)
    expect(wrapper.findAll('.i-mynaui-x-solid').length).toBe(2)
    expect(wrapper.findAll('.i-mynaui-check-solid').length).toBe(2)
  })

  it('derives the session name from the route when none is passed', async () => {
    vi.unstubAllGlobals()
    installHarness({ routePath: '/en/02.basics/11.quiz' })
    const wrapper = mountQuiz()
    await clickOption(wrapper, 'Four')
    await clickOption(wrapper, 'True')
    await wrapper.find('[data-testid="quiz-submit"]').trigger('click')
    await nextTick()
    expect(mockData.recordPass).toHaveBeenCalledWith('/en/basics/quiz', 100)
  })

  it('prefers an explicit sessionName prop over the route', async () => {
    const wrapper = mountQuiz({ sessionName: 'quiz-x' })
    await clickOption(wrapper, 'Four')
    await clickOption(wrapper, 'True')
    await wrapper.find('[data-testid="quiz-submit"]').trigger('click')
    await nextTick()
    expect(mockData.recordPass).toHaveBeenCalledWith('quiz-x', 100)
    expect(mockData.recordAttempt).not.toHaveBeenCalled()
  })
})
