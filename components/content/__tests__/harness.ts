// Shared test harness for mounting `components/content` helper components.
//
// Nuxt auto-imports (`ref`, `useI18n`, `parseEcInfo`, …) are bare globals in
// the SFCs, and every child component is resolved by name. Vitest has no Nuxt
// auto-import plugin, so tests install the real Vue/Nuxt symbols as globals
// and stub the presentational chrome. Keep this file free of `.vue` imports so
// importing it never pulls the component tree (or `motion-v`) eagerly.
import type { Ref } from 'vue'
import { vi } from 'vitest'
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  useAttrs,
  watch,
} from 'vue'

import { useCodeCopy } from '../../../composables/useCodeCopy'
import { useEcDecorations } from '../../../composables/useEcDecorations'
import { parseEcInfo } from '../../../composables/useEcParser'

// Mirrors app.config.ts. Kept inline because importing app.config.ts would
// call the auto-imported `defineAppConfig` global at module load.
export const appConfig = {
  codeSnippets: {
    annotation: {
      position: 'row' as 'row' | 'inline',
      rowPlacement: 'before' as 'before' | 'after',
    },
    collapse: {
      toggleable: true,
      collapsedIconClass: 'i-mynaui-chevron-right',
      expandedIconClass: 'i-mynaui-chevron-down',
      widgetClass: '',
    },
    highlight: { colors: ['tip', 'info', 'challenge'] },
  },
}

const translations: Record<string, string> = {
  'copy-code': 'Copy code',
  'copied-code': 'Copied!',
  'diff-view.before': 'Before',
  'diff-view.after': 'After',
  'loading': 'Loading…',
  'yt-player.watch': 'Watch on YouTube',
  'yt-player.description-goes-here': 'Video placeholder',
  'magic-move.previous-step': 'Previous step',
  'magic-move.next-step': 'Next step',
  'slash': '/',
  'quiz.check-title': 'Check your understanding',
  'quiz.question': 'Question {n}:',
  'quiz.submit': 'Check answers',
  'quiz.retake': 'Retake quiz',
  'quiz.passed': 'Passed!',
  'quiz.failed': 'Not quite — review the answers above',
  'quiz.explanation': 'Explanation',
  'quiz.completed': 'You\'ve passed this quiz',
  'quiz.answer-all-hint': 'Try answering all the questions first',
  'quiz.correct': 'Correct',
  'quiz.incorrect': 'Incorrect',
  'quiz.missed-answer': 'Correct answer — not selected',
  'challenge.check-title': 'Check your work',
  'challenge.check': 'Check my work',
  'challenge.checking': 'Checking…',
  'challenge.retake': 'Retake challenge',
  'challenge.hide-solution': 'Hide solution',
  'challenge.pass': 'Passed!',
  'challenge.fail': 'Not quite — see the details below',
  'challenge.completed': 'You\'ve completed this challenge',
  'update-the-code-in-the-playground-and-click-check-my-work': 'Update the code in the playground and click "Check my work"',
  'vue-live.title': 'Vue',
  'vue-live.reset-contents': 'Reset contents',
  'vue-live.clear-console': 'Clear console',
  'vue-live.reload-preview': 'Reload preview',
  'html-live.title': 'HTML',
  'html-live.reset-contents': 'Reset contents',
  'html-live.clear-console': 'Clear console',
  'html-live.reload-preview': 'Reload preview',
}

export function translate(key: string, params?: Record<string, unknown>): string {
  if (key === 'quiz.score')
    return `${params?.score}/${params?.total}`
  const template = translations[key] ?? key
  if (!params)
    return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ''))
}

/** `$t` mock for template interpolation. */
export const contentMocks = {
  $t: (key: string, params?: Record<string, unknown>) => translate(key, params),
}

/** IconButton stub: forwards `aria-label` and re-emits click. */
export const iconButtonStub = {
  name: 'IconButton',
  props: ['tooltip', 'tooltipPlacement', 'active', 'padding', 'unstyled', 'ariaLabel'],
  emits: ['click'],
  template: '<button type="button" :aria-label="ariaLabel || tooltip" @click="$emit(\'click\')"><slot /></button>',
}

/** Tooltip chrome stubs (only their slots matter to the tooltip adapter). */
export const tooltipTriggerStub = {
  name: 'TooltipTrigger',
  props: {
    id: String,
    noIcon: Boolean,
    defaultShown: Boolean,
    noFollow: Boolean,
    hideTimeout: Number,
    noEasing: Boolean,
    persistent: Boolean,
    placement: String,
    popperClass: String,
  },
  template: '<span class="tooltip-trigger-stub"><slot /></span>',
}

export const tooltipContentStub = {
  name: 'TooltipContent',
  props: { id: String },
  template: '<span class="tooltip-content-stub"><slot /></span>',
}

/** Guide store surface consumed by `ButtonShowSolution` and `ChallengeCheck` (refs unwrapped, as Pinia does). */
export interface GuideStoreMock {
  currentGuide: {
    solutions?: Record<string, string>
    sessionName?: string
    template?: string
    validation?: unknown
    [key: string]: unknown
  } | undefined
  showingSolution: boolean
  toggleSolutions: ReturnType<typeof vi.fn>
  mount: ReturnType<typeof vi.fn>
  buttonSolutionMessage: string
  buttonResetMessage: string
}

/** Console-output surface consumed by `VueLive`/`HtmlLive` (see `useConsoleOutput`). */
export interface ConsoleOutputMock {
  initConsole: ReturnType<typeof vi.fn>
  addLog: ReturnType<typeof vi.fn>
  clearLogs: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
}

/** Surface of `useUnsavedChangesStore` consumed by destructive content actions. */
export interface UnsavedChangesMock {
  isOpen: Ref<boolean>
  shouldGuard: () => boolean
  confirmOrDiscard: ReturnType<typeof vi.fn>
  prompt: ReturnType<typeof vi.fn>
  choose: ReturnType<typeof vi.fn>
}

/** Build a controllable `useConsoleOutput` return value (all methods are spies). */
export function consoleOutputMock(): ConsoleOutputMock {
  return {
    initConsole: vi.fn(async () => {}),
    addLog: vi.fn(),
    clearLogs: vi.fn(),
    destroy: vi.fn(),
  }
}

/** Build a controllable `useGuideStore` return value (reactive, refs unwrapped). */
export function guideStoreMock(overrides: Partial<GuideStoreMock> = {}): GuideStoreMock {
  const state = reactive({
    currentGuide: overrides.currentGuide ?? undefined,
    showingSolution: overrides.showingSolution ?? false,
    buttonSolutionMessage: overrides.buttonSolutionMessage ?? 'Show solution',
    buttonResetMessage: overrides.buttonResetMessage ?? 'Reset challenge',
  })
  const toggleSolutions = vi.fn(async () => {
    state.showingSolution = !state.showingSolution
  })
  const mount = overrides.mount ?? vi.fn(async () => {})
  return Object.assign(state, { toggleSolutions, mount })
}

export interface HarnessOverrides {
  /** Clipboard write implementation; a spy is used by default. */
  copy?: (content: string) => Promise<void> | void
  /** Initial `useColorMode()` value. */
  colorMode?: 'light' | 'dark'
  /** Initial `useMediaQuery()` value. */
  isNarrow?: boolean
  /** Initial `useRoute().path` value. */
  routePath?: string
  /** Replace the no-op `useTwoslashTooltips` (e.g. with the real one). */
  useTwoslashTooltips?: (el: Ref<HTMLElement | undefined>) => void
  /** Overrides for the `useGuideStore` mock. */
  guide?: Partial<GuideStoreMock>
}

/**
 * Install Vue/Nuxt auto-import globals for a content-component mount.
 * Call from `beforeEach`; clean up with `vi.unstubAllGlobals()`.
 */
export function installHarness(overrides: HarnessOverrides = {}) {
  const copy = vi.fn(overrides.copy ?? (async () => {}))
  const guide = guideStoreMock(overrides.guide)
  const colorMode = ref(overrides.colorMode ?? 'light')
  const consoleOutput = consoleOutputMock()

  // Vue
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('reactive', reactive)
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('watch', watch)
  vi.stubGlobal('onMounted', onMounted)
  vi.stubGlobal('onUnmounted', onUnmounted)
  vi.stubGlobal('nextTick', nextTick)
  vi.stubGlobal('useAttrs', useAttrs)

  // happy-dom returns an empty computed style for detached mounts, which
  // defeats the font-size stepping math; fall back to the inline size.
  vi.stubGlobal(
    'getComputedStyle',
    (el: HTMLElement) =>
      ({ fontSize: el?.style?.fontSize || '16px' }) as unknown as CSSStyleDeclaration,
  )

  // Nuxt / app composables
  vi.stubGlobal('parseEcInfo', parseEcInfo)
  vi.stubGlobal('useEcDecorations', useEcDecorations)
  vi.stubGlobal('useCodeCopy', useCodeCopy)
  vi.stubGlobal('useAppConfig', () => appConfig)
  vi.stubGlobal('useClipboard', () => ({ copy }))
  vi.stubGlobal('useColorMode', () => colorMode)
  vi.stubGlobal('useConsoleOutput', () => consoleOutput)
  vi.stubGlobal('useMediaQuery', () => ref(overrides.isNarrow ?? false))
  vi.stubGlobal('useRoute', () => ({ path: overrides.routePath ?? '/en/basics/quiz' }))
  vi.stubGlobal('useI18n', () => ({ t: translate }))
  vi.stubGlobal('useMutationObserver', () => {})
  vi.stubGlobal('useTwoslashTooltips', overrides.useTwoslashTooltips ?? (() => {}))
  vi.stubGlobal('useGuideStore', () => guide)
  vi.stubGlobal('useId', () => 'mm-test-id')

  // Destructive content actions (retake / show solution) confirm through this
  // store; default to "proceed" so unchanged tests keep their behavior.
  const unsavedChanges: UnsavedChangesMock = {
    isOpen: ref(false),
    shouldGuard: () => false,
    confirmOrDiscard: vi.fn(async () => true),
    prompt: vi.fn(async () => 'leave'),
    choose: vi.fn(),
  }
  vi.stubGlobal('useUnsavedChangesStore', () => unsavedChanges)

  return { copy, guide, colorMode, consoleOutput, unsavedChanges }
}

/** Build one shiki-ish `.line` span with a `line` attribute. */
export function makeLine(text: string, lineNo: number): HTMLElement {
  const line = document.createElement('span')
  line.className = 'line'
  line.setAttribute('line', String(lineNo))
  line.textContent = text
  return line
}

/** Build a `<pre><code>` shell around the given line spans. */
export function makePre(lines: HTMLElement[]): HTMLElement {
  const pre = document.createElement('pre')
  const code = document.createElement('code')
  for (const line of lines)
    code.appendChild(line)
  pre.appendChild(code)
  return pre
}
