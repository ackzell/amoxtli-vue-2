<script setup lang="ts">
import { ShikiMagicMove } from 'shiki-magic-move/vue'
import { computed, onMounted, ref } from 'vue'
import 'shiki-magic-move/dist/style.css'

const props = defineProps<{
  lang?: string
  theme?: string
}>()

const colorMode = useColorMode()

// ─── State ───────────────────────────────────────────────────────────────────
interface Step {
  code: string
  label?: string
}

const slotRef = ref<HTMLElement>()
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

// ─── Bootstrap ───────────────────────────────────────────────────────────────
onMounted(async () => {
  const preEls = slotRef.value?.querySelectorAll('pre') ?? []

  // it's on another tree?
  const labelEls = slotRef.value?.querySelectorAll('[data-filename]') ?? []
  // console.log('[magic-move]: found preEls', preEls)

  // console.log('[magic-move]:', slotRef.value)

  steps.value = Array.from(preEls).map((pre, i) => {
    // console.log('[magic-move]: pre is', pre)

    return {
      code: (pre.querySelector('code')?.textContent ?? '').trimEnd(),
      label: labelEls[i]?.textContent?.trim() || '',
    }
  })

  // console.log('[magic-move]: steps', steps.value)

  if (steps.value.length === 0) {
    console.warn('[MagicMove] No <pre><code> blocks found inside ::magic-move. '
      + 'Make sure you are using fenced code blocks inside the component.')
    return
  }

  // 2. Create a client-side Shiki highlighter.
  //    We need it separately from Nuxt Content's SSR highlighter because
  //    shiki-magic-move needs the live instance to diff and animate tokens.
  highlighter.value = await useMagicMoveHighlighter()
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
</script>

<template>
  <!-- Hidden slot: rendered by Nuxt Content (SSR-highlighted HTML).
       We parse it in onMounted to extract plain-text code steps. -->
  <div ref="slotRef" aria-hidden="true" class="hidden">
    <slot />
  </div>

  <div
    v-if="isReady"
    class="magic-move-slot-container my-8 outline-none rounded-md overflow-hidden hover:shadow-md"
    bg="bgr-50 dark:bgr-800"
    border="~ bgr-700/10 dark:bgr-50/10"
    focus-visible:ring-1 focus-visible:ring-primary-300 dark:focus-visible:ring-primary-dark-900
    tabindex="0"
    @keydown="handleKey"
  >
    <!-- top bar -->
    <div
      class="px-4 py-2.5 border-bgr-700/10 flex items-center justify-between dark:border-bgr-50/10"
      bg="~ bgr-100/40 dark:bgr-dark"
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
        class="text-xs font-mono p1.5 text-center select-none truncate"
      >
        {{ currentLabel }}
      </div>
    </Transition>

    <!-- Animated code block -->
    <div class="shiki-magic-move-container text-sm min-h-20">
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
      class="px-4 py-3 flex gap-1.5 justify-center"
      bg="~ bgr-100/40 dark:bgr-dark"
    >
      <span class="text-xs tracking-wide font-mono">
        {{ currentStep + 1 }}<span class="mx-1 opacity-40" />{{ $t('slash') }} {{ steps.length }}
      </span>
    </div>
  </div>

  <!-- Loading state: shown while highlighter initialises -->
  <div v-else-if="steps.length === 0 && !isReady" class="text-sm font-mono py-8 text-center">
    {{ $t('loading') }}
  </div>
</template>

<style scoped>
.shiki-magic-move-container {
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
