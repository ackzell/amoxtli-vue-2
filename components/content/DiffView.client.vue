<script setup lang="ts">
import cssLang from 'highlight.js/lib/languages/css'
import tsLang from 'highlight.js/lib/languages/typescript'
import vCodeDiff, { CodeDiff } from 'v-code-diff'
import { computed, onMounted, ref } from 'vue'

const props = withDefaults(defineProps<{
  /** Language of the two fenced blocks; mapped to a highlight.js grammar. */
  lang?: string
  /** Label for the "before" (old) pane. Defaults to i18n diff-view.before. */
  before?: string
  /** Label for the "after" (new) pane. Defaults to i18n diff-view.after. */
  after?: string
  /** Max height of the diff panes before they scroll vertically. */
  maxHeight?: string
  /** Force a display mode; default side-by-side, falls back to line-by-line on narrow screens. */
  outputFormat?: 'side-by-side' | 'line-by-line'
}>(), {
  lang: 'plaintext',
  maxHeight: '28rem',
})
// v-code-diff only registers a small set of grammars (xml, javascript, json,
// yaml, plaintext, python, java, bash, sql) into a shared hljs instance.
// Register the extras we care about once — vue/svelte diffs highlight script
// bodies via typescript, and xml's `<style>` subLanguage needs css.
vCodeDiff.hljs.registerLanguage('css', cssLang)
vCodeDiff.hljs.registerLanguage('typescript', tsLang)

const { t } = useI18n()
const colorMode = useColorMode()

// Map author-facing fence languages to grammars v-code-diff understands.
// v-code-diff highlights each line in isolation with a single grammar, so a
// block-scoped grammar (xml) can't colorize `<script>` contents — bare JS/TS
// lines match nothing. vue/svelte diffs are script-heavy, so render them with
// typescript; `html` diffs are pure markup and keep xml's tag coloring.
const HLJS_LANG_MAP: Record<string, string> = {
  vue: 'typescript',
  svelte: 'typescript',
  html: 'xml',
  ts: 'typescript',
  tsx: 'typescript',
  typescript: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  javascript: 'javascript',
  css: 'css',
  scss: 'css',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
}

const hljsLanguage = computed(() => {
  const normalized = (props.lang || '').toLowerCase()
  return (HLJS_LANG_MAP[normalized] ?? normalized) || 'plaintext'
})

const theme = computed<'light' | 'dark'>(
  () => colorMode.value === 'dark' ? 'dark' : 'light',
)

// Side-by-side is cramped on narrow screens — swap to line-by-line below md.
// No media query at all does the same; a forced outputFormat prop wins.
const isNarrow = useMediaQuery('(max-width: 767px)')
const activeFormat = computed<'side-by-side' | 'line-by-line'>(
  () => props.outputFormat ?? (isNarrow.value ? 'line-by-line' : 'side-by-side'),
)

// ─── Slot parsing (MagicMove pattern) ───────────────────────────────────────
// The two fenced blocks render as hidden SSR-highlighted ProsePre nodes; we
// read their raw text on mount. First fence = old, second fence = new.
const slotRef = ref<HTMLElement>()
const oldString = ref('')
const newString = ref('')

const isReady = computed(() => oldString.value.length > 0 || newString.value.length > 0)

function parseFences() {
  const preEls = slotRef.value?.querySelectorAll('pre') ?? []
  const texts = Array.from(preEls)
    .map(pre => pre.querySelector('code')?.textContent ?? '')
    .map(text => text.trimEnd())
  oldString.value = texts[0] ?? ''
  newString.value = texts[1] ?? ''
}

onMounted(parseFences)

// Re-parse when the slot DOM changes (HMR re-renders the slot content).
useMutationObserver(slotRef, parseFences, {
  childList: true,
  subtree: true,
})

const oldLabel = computed(() => props.before || t('diff-view.before'))
const newLabel = computed(() => props.after || t('diff-view.after'))
</script>

<template>
  <div class="diff-view-root not-prose my-5 max-w-4xl">
    <!-- Hidden slot: rendered by Nuxt Content (SSR-highlighted HTML for the
         two fence blocks). Parsed on mount into old/new strings. -->
    <div ref="slotRef" aria-hidden="true" class="hidden">
      <slot />
    </div>

    <!-- Scroller so long lines / the split table can breathe on small screens. -->
    <div
      v-if="isReady"
      class="diff-view-scroller overflow-x-auto"
    >
      <CodeDiff
        :old-string="oldString"
        :new-string="newString"
        :output-format="activeFormat"
        :language="hljsLanguage"
        :theme="theme"
        :max-height="props.maxHeight"
        :filename="oldLabel"
        :new-filename="newLabel"
      />
    </div>

    <!-- Loading state: shown until the slot is parsed on mount. -->
    <div
      v-else
      class="text-sm font-mono py-8 text-center"
    >
      {{ t('loading') }}
    </div>
  </div>
</template>

<style>
/*
 * v-code-diff injects its stylesheet at module eval with GitHub Primer
 * palettes (`.code-diff-view[theme=light|dark]`, specificity 0,2,0). Our
 * overrides bump specificity to 0,3,0 (`.diff-view-root .code-diff-view`) so
 * the panes pick up the site's tokens instead. Deliberately unscoped: it has
 * to beat an injected global stylesheet, and `.diff-view-root` keeps it
 * contained to this component.
 */
.diff-view-root .code-diff-view {
  margin: 0;
  border: 1px solid var(--colors-bgr-200);
  border-radius: 0.5rem;
  scrollbar-width: thin;
}

.diff-view-root .code-diff-view[theme='dark'] {
  border-color: var(--colors-bgr-700);
}

.diff-view-root .code-diff-view[theme='light'] {
  --color-canvas-default: var(--colors-bgr-50);
  --color-canvas-subtle: var(--colors-bgr-100);
  --color-canvas-inset: var(--colors-bgr-50);
  --color-fg-default: var(--colors-foreground);
  --color-fg-subtle: var(--colors-bgr-500);
  --color-border-default: var(--colors-bgr-200);
  --color-border-muted: var(--colors-bgr-200);
  --color-diff-blob-addition-line-bg: color-mix(in oklab, var(--colors-positive-500) 12%, transparent);
  --color-diff-blob-addition-word-bg: color-mix(in oklab, var(--colors-positive-500) 40%, transparent);
  --color-diff-blob-addition-num-bg: color-mix(in oklab, var(--colors-positive-500) 32%, transparent);
  --color-diff-blob-deletion-line-bg: color-mix(in oklab, var(--colors-negative-500) 12%, transparent);
  --color-diff-blob-deletion-word-bg: color-mix(in oklab, var(--colors-negative-500) 40%, transparent);
  --color-diff-blob-deletion-num-bg: color-mix(in oklab, var(--colors-negative-500) 32%, transparent);
}

.diff-view-root .code-diff-view[theme='dark'] {
  --color-canvas-default: var(--colors-bgr-900);
  --color-canvas-subtle: var(--colors-bgr-800);
  --color-canvas-inset: var(--colors-bgr-900);
  --color-fg-default: var(--colors-foreground-dark);
  --color-fg-subtle: var(--colors-bgr-400);
  --color-border-default: var(--colors-bgr-700);
  --color-border-muted: var(--colors-bgr-700);
  --color-diff-blob-addition-line-bg: color-mix(in oklab, var(--colors-positive-500) 14%, transparent);
  --color-diff-blob-addition-word-bg: color-mix(in oklab, var(--colors-positive-500) 40%, transparent);
  --color-diff-blob-addition-num-bg: color-mix(in oklab, var(--colors-positive-500) 32%, transparent);
  --color-diff-blob-deletion-line-bg: color-mix(in oklab, var(--colors-negative-500) 14%, transparent);
  --color-diff-blob-deletion-word-bg: color-mix(in oklab, var(--colors-negative-500) 40%, transparent);
  --color-diff-blob-deletion-num-bg: color-mix(in oklab, var(--colors-negative-500) 32%, transparent);
}

/* The next/prev arrows query `.blob-code-addition` document-globally
   (CodeDiff.vue), so with 2+ diff-views on a page they highlight/scroll the
   wrong block. Panes here are static teaching material — drop the arrows. */
.diff-view-root .code-diff-view .diff-commandbar {
  display: none;
}

.diff-view-root .code-diff-view .file-header {
  background-color: var(--color-canvas-default);
  border-bottom: none;
}
</style>
