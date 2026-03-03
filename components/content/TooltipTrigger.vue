<script setup lang="ts">
import { onUnmounted, reactive, ref } from 'vue'

const { id } = defineProps<{ id: string }>()

const isShown = ref(false)
const mousePosition = reactive({ x: 0, y: 0 })
const dropdownRef = ref<any>(null)
let animationFrameId: number | null = null
let pendingUpdate = false

// Virtual element that follows the mouse
const virtualElement = {
  getBoundingClientRect: () => {
    return {
      width: 0,
      height: 0,
      top: mousePosition.y,
      right: mousePosition.x,
      bottom: mousePosition.y,
      left: mousePosition.x,
      x: mousePosition.x,
      y: mousePosition.y,
    }
  },
}

// return the rendered HTML string from the hidden content node
function contentFn() {
  if (typeof document === 'undefined')
    return ''
  const el = document.querySelector(`[data-tooltip-id="${id}"]`)
  return el ? el.innerHTML : ''
}

function updatePosition() {
  if (dropdownRef.value?.$refs?.popper?.$_computePosition) {
    dropdownRef.value.$refs.popper.$_computePosition()
  }
  pendingUpdate = false
  animationFrameId = null
}

function updateMousePosition(event: MouseEvent) {
  mousePosition.x = event.clientX
  mousePosition.y = event.clientY

  // Use requestAnimationFrame to throttle updates to screen refresh rate
  if (!pendingUpdate) {
    pendingUpdate = true
    animationFrameId = requestAnimationFrame(updatePosition)
  }
}

function showTooltip() {
  isShown.value = true
}

function hideTooltip() {
  isShown.value = false
  // Cancel any pending updates when hiding
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
    pendingUpdate = false
  }
}

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }
})
</script>

<template>
  <VDropdown
    ref="dropdownRef"
    theme="guide-tooltip"
    :triggers="[]"
    :shown="isShown"
    :reference-node="() => virtualElement"
    :auto-hide="false"
    :popper-triggers="['hover']"
    :distance="6"
    :delay="{ show: 0, hide: 300 }"
  >
    <span
      class="cursor-help underline decoration-dotted"
      @mouseenter="showTooltip"
      @mouseleave="hideTooltip"
      @mousemove="updateMousePosition"
    >
      <slot />
    </span>

    <template #popper="{ hide }">
      <span
        class="tooltip-content"
        @click="(e) => {
          // Allow links to work normally
          if (e.target.tagName === 'A') {
            hide()
          }
        }"
        v-html="contentFn()"
      />
    </template>
  </VDropdown>
</template>

<style>
.v-popper.v-popper--theme-guide-tooltip {
  display: inline;
}

.dark .v-popper--theme-guide-tooltip {
  .v-popper__inner {
    border: 1px solid var(--amv-highlight);
    background: rgba(0, 0, 0, 0.8);
    padding: 12px;
    border-radius: 6px;
    max-width: 400px;
  }

  p {
    --uno: text-text-dark;
    code {
      color: var(--code-color);
    }
  }

  blockquote {
    border-left: 4px solid var(--amv-highlight);
    padding-left: 1rem;
    margin-left: 0;
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
    color: var(--tk-text-primary);
    opacity: 0.9;
  }
}

.dark .v-popper__popper .v-popper__arrow-outer {
  border-color: var(--amv-highlight);
}

.v-popper--theme-guide-tooltip {
  .v-popper__inner {
    background: tomato;
    padding: 12px;
    border-radius: 6px;
    max-width: 400px;
  }
}

.v-popper__popper .v-popper__arrow-outer {
  border-color: tomato;
}

.tooltip-content {
  a {
    color: white;
    text-decoration: underline;

    &:hover {
      opacity: 0.8;
    }
  }

  blockquote {
    margin: 0.5em 0;
    padding-left: 3em;
    border-left: 3px solid rgba(255, 255, 255, 0.3);
  }
}
</style>
