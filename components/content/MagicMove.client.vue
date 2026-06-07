<script setup lang="ts">
import { ShikiMagicMove } from '@shikijs/magic-move/vue'
import { computed, onMounted, ref, watch } from 'vue'
import '@shikijs/magic-move/style.css'

const props = defineProps<{
  lang?: string
  theme?: string
}>()

const colorMode = useColorMode()
const { copied, copyCode } = useCodeCopy()

// ─── State ───────────────────────────────────────────────────────────────────
interface Step {
  code: string
  label?: string
}

const instanceId = useId()
const slotRef = ref<HTMLElement>()
const containerRef = ref<HTMLElement>()
const highlighter = ref()
const currentStep = ref(0)
const steps = ref<Step[]>([])
const isReady = computed(() => highlighter.value && steps.value.length > 0)
const currentCode = computed(() => steps.value[currentStep.value]?.code ?? '')
const currentLabel = computed(() => steps.value[currentStep.value]?.label)
const isFirst = computed(() => currentStep.value === 0)
const isLast = computed(() => currentStep.value === steps.value.length - 1)
const activeTheme = computed(() =>
  colorMode.value === 'dark' ? 'vesper' : 'amoxtli-light',
)

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getPreEl(): HTMLElement | null {
  return containerRef.value?.querySelector('pre') ?? null
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────
async function initializeSteps() {
  const preEls = slotRef.value?.querySelectorAll('pre') ?? []
  const labelEls = slotRef.value?.querySelectorAll('[data-filename]') ?? []

  steps.value = Array.from(preEls).map((pre, i) => ({
    code: (pre.querySelector('code')?.textContent ?? '').trimEnd(),
    label: labelEls[i]?.textContent?.trim() ?? '',
  }))

  if (steps.value.length > 0 && !highlighter.value) {
    highlighter.value = await useMagicMoveHighlighter()
  }
}

onMounted(initializeSteps)

// Observe slot DOM content changes (handles HMR when the parent re-renders slot content)
useMutationObserver(slotRef, initializeSteps, {
  childList: true,
  subtree: true,
})

// Clamp currentStep when steps change
watch(steps, (newSteps) => {
  if (newSteps.length === 0) {
    currentStep.value = 0
  }
  else if (currentStep.value >= newSteps.length) {
    currentStep.value = newSteps.length - 1
  }
})

// ─── Controls ────────────────────────────────────────────────────────────────
function prev() {
  if (!isFirst.value)
    currentStep.value--
}

function next() {
  if (!isLast.value)
    currentStep.value++
}

function handleKey(e: KeyboardEvent) {
  if (e.key === 'ArrowRight')
    next()
  if (e.key === 'ArrowLeft')
    prev()
}

function handleIncreaseFontSize() {
  const preEl = getPreEl()
  if (!preEl)
    return
  const currentSize = Number.parseFloat(getComputedStyle(preEl).fontSize)
  preEl.style.fontSize = `${currentSize + 2}px`
}

function handleDecreaseFontSize() {
  const preEl = getPreEl()
  if (!preEl)
    return
  const currentSize = Number.parseFloat(getComputedStyle(preEl).fontSize)
  preEl.style.fontSize = `${currentSize - 2}px`
}

function handleCopy() {
  copyCode(currentCode.value || '')
}
</script>

<template>
  <!-- Hidden slot: rendered by Nuxt Content (SSR-highlighted HTML).
       We parse it in onMounted to extract plain-text code steps. -->
  <div ref="slotRef" aria-hidden="true" class="hidden">
    <slot />
  </div>

  <div
    v-if="isReady"
    ref="containerRef"
    :data-magic-move-id="instanceId"
    class="magic-move-slot-container my-8 outline-none rounded-md overflow-hidden hover:shadow-md"
    bg="bgr-50 dark:bgr-900"
    border="~ bgr-700/10 dark:bgr-50/10"
    focus-visible:ring-1 focus-visible:ring-primary-300 dark:focus-visible:ring-primary-dark-900
    tabindex="0"
    @keydown="handleKey"
  >
    <!-- top bar -->
    <div
      class="px-4 py-2.5 border-bgr-700/10 flex items-center justify-between dark:border-bgr-50/10"
      bg="~ bgr-100/40 dark:bgr-900"
    >
      <div>
        <IconButton
          tooltip-placement="bottom"
          :disabled="isFirst"
          :aria-label="$t('magic-move.previous-step')"
          :tooltip="$t('magic-move.previous-step')"
          @click="prev"
        >
          <div i-mynaui-chevron-left h4 w4 />
        </IconButton>

        <IconButton
          tooltip-placement="bottom"
          :disabled="isLast"
          :aria-label="$t('magic-move.next-step')"
          :tooltip="$t('magic-move.next-step')"
          @click="next"
        >
          <div i-mynaui-chevron-right h4 w4 />
        </IconButton>
      </div>

      <!-- Step pills -->
      <div flex gap-2 role="tablist" aria-label="Code steps">
        <button
          v-for="(_, i) in steps"
          :key="i"
          role="tab"
          :aria-selected="i === currentStep"
          class="text-[11px] font-mono p-0 border rounded-full grid h6.5 w6.5 cursor-pointer transition-colors duration-180 place-items-center"
          :class="i === currentStep
            ? 'bg-primary-300 dark:bg-primary-dark-200/90 border-primary-300 dark:border-primary-dark-100 text-slate-900 font-bold'
            : 'bg-transparent border-bgr-700/10 dark:border-bgr-50/10  hover:border-primary-600 hover:text-primary-600 dark:hover:border-primary-dark-300 dark:hover:text-primary-dark-300'"
          @click="currentStep = i"
        >
          {{ i + 1 }}
        </button>
      </div>
    </div>

    <Transition name="fade" mode="out-in">
      <div
        v-if="currentLabel"
        :key="currentLabel"
        text-xs text-primary-700
        font-mono p1.5
        text-center
        select-none truncate dark:text-primary-dark-100
      >
        {{ currentLabel }}
      </div>
    </Transition>

    <!-- Animated code block -->
    <div class="shiki-magic-move-container group text-sm min-h-20 relative">
      <ProsePreDecreaseFontSizeButton
        right-18 top-2 absolute
        @decrease-font-size="handleDecreaseFontSize"
      />

      <ProsePreIncreaseFontSizeButton
        right-10 top-2 absolute
        @increase-font-size="handleIncreaseFontSize"
      />

      <ProsePreCopyButton
        right-2 top-2 absolute
        :copied="copied"
        @copy="handleCopy"
      />

      <ShikiMagicMove
        :key="activeTheme"
        :lang="props.lang ?? 'ts'"
        :theme="activeTheme"
        :highlighter="highlighter"
        :code="currentCode"
        :options="{ duration: 550, stagger: 0.25, lineNumbers: true }"
      />
    </div>

    <!-- bottom bar -->
    <div
      class="px-4 py-3 flex gap-1.5 items-center justify-between"
      bg="~ bgr-100/40 dark:bgr-900"
    >
      <div>
        <IconButton
          tooltip-placement="bottom"
          :disabled="isFirst"
          aria-label="Previous step"
          tooltip="Previous step"
          @click="prev"
        >
          <div i-mynaui-chevron-left h4 w4 />
        </IconButton>

        <IconButton
          tooltip-placement="bottom"
          :disabled="isLast"
          aria-label="Next step"
          tooltip="Next step"
          @click="next"
        >
          <div i-mynaui-chevron-right h4 w4 />
        </IconButton>
      </div>

      <span class="text-xs tracking-wide font-mono">
        {{ currentStep + 1 }}<span class="mx-1 opacity-40" />{{ $t('slash') }} {{ steps.length }}
      </span>
    </div>
  </div>

  <!-- Loading state: shown while steps are parsed or highlighter initialises -->
  <div v-else class="text-sm font-mono py-8 text-center">
    {{ $t('loading') }}
  </div>
</template>

<style scoped>
.shiki-magic-move-container {
  --uno: 'dark:bg-bgr-dark!';
  pre {
    --uno: 'm0 font-code line-height-[1.6] text-wrap';
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
