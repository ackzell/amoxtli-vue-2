<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const props = withDefaults(defineProps<{
  /** Language of the two fenced blocks. */
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

const { t } = useI18n()

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

    <DiffCode
      v-if="isReady"
      :old-string="oldString"
      :new-string="newString"
      :output-format="activeFormat"
      :lang="props.lang"
      :max-height="props.maxHeight"
      :before="oldLabel"
      :after="newLabel"
    />

    <!-- Loading state: shown until the slot is parsed on mount. -->
    <div
      v-else
      class="text-sm font-mono py-8 text-center"
    >
      {{ t('loading') }}
    </div>
  </div>
</template>
