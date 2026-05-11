<script setup lang="ts">
const { id } = defineProps<{ id: string }>()

const isShown = ref(false)
const anchorEl = ref<HTMLElement>()
const targetPosition = reactive({ x: 0, y: 0 })
const tooltipPosition = reactive({ x: 0, y: 0 })
let hideTimer: ReturnType<typeof setTimeout> | null = null
let animationFrameId: number | null = null

const FOLLOW_EASING = 0.28
const FOLLOW_THRESHOLD = 0.25
const TOOLTIP_POINTER_X = 16
const TOOLTIP_OFFSET_Y = 14

function contentFn() {
  if (typeof document === 'undefined')
    return ''
  const el = document.querySelector(`[data-tooltip-id="${id}"]`)
  return el ? el.innerHTML : ''
}

const tooltipStyle = computed(() => ({
  'left': `${tooltipPosition.x - TOOLTIP_POINTER_X}px`,
  'top': `${tooltipPosition.y + TOOLTIP_OFFSET_Y}px`,
  '--tooltip-pointer-x': `${TOOLTIP_POINTER_X}px`,
}))

function clearHideTimer() {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

function stopAnimation() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

function animateToTarget() {
  const dx = targetPosition.x - tooltipPosition.x
  const dy = targetPosition.y - tooltipPosition.y

  if (Math.abs(dx) < FOLLOW_THRESHOLD && Math.abs(dy) < FOLLOW_THRESHOLD) {
    tooltipPosition.x = targetPosition.x
    tooltipPosition.y = targetPosition.y
  }
  else {
    tooltipPosition.x += dx * FOLLOW_EASING
    tooltipPosition.y += dy * FOLLOW_EASING
  }

  const shouldKeepAnimating = isShown.value
    || Math.abs(targetPosition.x - tooltipPosition.x) >= FOLLOW_THRESHOLD
    || Math.abs(targetPosition.y - tooltipPosition.y) >= FOLLOW_THRESHOLD

  if (shouldKeepAnimating)
    animationFrameId = requestAnimationFrame(animateToTarget)
  else
    animationFrameId = null
}

function ensureAnimation() {
  if (animationFrameId === null)
    animationFrameId = requestAnimationFrame(animateToTarget)
}

function showTooltip(event?: MouseEvent) {
  clearHideTimer()
  if (event)
    updateMousePosition(event)
  isShown.value = true
  ensureAnimation()
}

function scheduleHide() {
  clearHideTimer()
  hideTimer = setTimeout(() => {
    isShown.value = false
    ensureAnimation()
  }, 120)
}

function updateMousePosition(event: MouseEvent) {
  targetPosition.x = event.clientX
  targetPosition.y = event.clientY
  if (!isShown.value) {
    tooltipPosition.x = targetPosition.x
    tooltipPosition.y = targetPosition.y
  }
  ensureAnimation()
}

function handleTooltipClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  if (target?.closest('a'))
    isShown.value = false
}

onUnmounted(() => {
  clearHideTimer()
  stopAnimation()
})
</script>

<template>
  <span
    ref="anchorEl"
    class="cursor-help underline decoration-dotted"
    @mouseenter="showTooltip($event)"
    @mouseleave="scheduleHide"
    @mousemove="updateMousePosition"
  >
    <slot /><span i-mynaui-star-solid ml-0.5 inline-block h2 w2 text-xs text-primary dark:text-primary-dark />
  </span>

  <Teleport to="body">
    <div
      v-if="isShown"
      class="guide-tooltip-popper"
      :style="tooltipStyle"
      @mouseenter="showTooltip()"
      @mouseleave="scheduleHide"
      @click="handleTooltipClick"
    >
      <span class="tooltip-content" v-html="contentFn()" />
    </div>
  </Teleport>
</template>

<style>
.guide-tooltip-popper {
  --r: 5px; /* Corner Radius */
  --ap: 1.5rem; /* Arrow Position */
  --ah: 11px; /* Arrow Height */
  --aw: 11px; /* Arrow Width (Half) */
  box-sizing: border-box; /* Important for padding logic */

  position: fixed;
  z-index: 300;
  max-width: 400px;
  border-radius: var(--r);
  border: 1px solid var(--amv-highlight);
  pointer-events: auto;
  --uno: 'bg-bgr-50/10 dark:bg-bgr-600/10  backdrop-blur-sm p2';

  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15)) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));

  /* Padding added to compensate for Arrow Height */
  padding-top: calc(var(--ah) + 8px);

  /* The Shape */
  border-shape: shape(
    from var(--r) var(--ah),
    hline to calc(var(--ap) - var(--aw)),
    line by var(--aw) calc(var(--ah) * -1),
    line by var(--aw) var(--ah),
    hline to calc(100% - var(--r)),
    curve to right calc(var(--ah) + var(--r)) with right calc(var(--ah)),
    vline to calc(100% - var(--r)),
    curve to calc(100% - var(--r)) bottom with right bottom,
    hline to var(--r),
    curve to left calc(100% - var(--r)) with left bottom,
    vline to calc(var(--ah) + var(--r)),
    curve to var(--r) var(--ah) with left var(--ah)
  );

  clip-path: shape(
    from var(--r) calc(var(--ah)),
    hline to calc(var(--ap) - var(--aw)),
    line by calc(var(--aw)) calc(var(--ah) * -1),
    line by calc(var(--aw) + 2px) var(--ah),
    hline to calc(100% - var(--r)),
    curve to right calc(var(--ah) + var(--r)) with right calc(var(--ah)),
    vline to calc(100% - var(--r)),
    curve to calc(100% - var(--r)) bottom with right bottom,
    hline to var(--r),
    curve to left calc(100% - var(--r)) with left bottom,
    vline to calc(var(--ah) + var(--r)),
    curve to var(--r) calc(var(--ah)) with left calc(var(--ah))
  );

  overflow: visible;
}

.guide-tooltip-popper p {
  --uno: text-text-dark;

  code {
    color: var(--code-color);
  }
}

.guide-tooltip-popper blockquote {
  border-left: 4px solid var(--amv-highlight);
  padding-left: 1rem;
  margin-left: 0;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  color: var(--tk-text-primary);
  opacity: 0.9;
}

.tooltip-content {
  a {
    color: var(--amv-highlight);
    text-decoration: underline;

    &:hover {
      opacity: 0.8;
    }
  }

  blockquote {
    margin: 0.5em 0;
    padding-left: 3em;
    border-left: 3px solid var(--amv-highlight);
  }
}
</style>
