<script setup lang="ts">
import type { Placement, VirtualElement } from '@floating-ui/dom'
import {
  computePosition,
  flip,
  offset,
  shift,
} from '@floating-ui/dom'

const { id } = defineProps<{ id: string }>()

const isShown = ref(false)

const tooltipEl = ref<HTMLElement | null>(null)

const mousePosition = reactive({
  x: 0,
  y: 0,
})

const targetPosition = reactive({
  x: 0,
  y: 0,
})

const tooltipPosition = reactive({
  x: 0,
  y: 0,
})

const floatingPlacement = ref<Placement>('bottom-start')

let hideTimer: ReturnType<typeof setTimeout> | null = null
let animationFrameId: number | null = null

const FOLLOW_EASING = 0.28
const FOLLOW_THRESHOLD = 0.25
const HIDE_TIMER_DELAY = 600
const ARROW_MIN_PADDING = 18

function contentFn() {
  if (typeof document === 'undefined')
    return ''

  const el = document.querySelector(`[data-tooltip-id="${id}"]`)

  return el ? el.innerHTML : ''
}

const tooltipStyle = computed(() => {
  const tooltipWidth = tooltipEl.value?.offsetWidth ?? 0

  const rawArrowX = mousePosition.x - tooltipPosition.x

  const clampedArrowX = Math.max(
    ARROW_MIN_PADDING,
    Math.min(
      tooltipWidth - ARROW_MIN_PADDING,
      rawArrowX,
    ),
  )

  return {
    'left': `${tooltipPosition.x}px`,
    'top': `${tooltipPosition.y}px`,
    '--ap': `${clampedArrowX}px`,
  }
})

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

async function updateFloatingPosition() {
  if (!tooltipEl.value)
    return

  const virtualReference: VirtualElement = {
    getBoundingClientRect() {
      return {
        x: mousePosition.x,
        y: mousePosition.y,
        top: mousePosition.y,
        left: mousePosition.x,
        right: mousePosition.x,
        bottom: mousePosition.y,
        width: 0,
        height: 0,
      }
    },
  }

  const { x, y, placement } = await computePosition(
    virtualReference,
    tooltipEl.value,
    {
      placement: 'bottom-start',
      middleware: [
        offset(18),
        flip({
          fallbackPlacements: [
            'top',
            'bottom',
          ],
        }),
        shift({
          padding: 12,
        }),
      ],
    },
  )

  floatingPlacement.value = placement

  targetPosition.x = x
  targetPosition.y = y
}

function animateToTarget() {
  const dx = targetPosition.x - tooltipPosition.x
  const dy = targetPosition.y - tooltipPosition.y

  if (
    Math.abs(dx) < FOLLOW_THRESHOLD
    && Math.abs(dy) < FOLLOW_THRESHOLD
  ) {
    tooltipPosition.x = targetPosition.x
    tooltipPosition.y = targetPosition.y
  }
  else {
    tooltipPosition.x += dx * FOLLOW_EASING
    tooltipPosition.y += dy * FOLLOW_EASING
  }

  const shouldKeepAnimating = isShown.value
    || Math.abs(dx) >= FOLLOW_THRESHOLD
    || Math.abs(dy) >= FOLLOW_THRESHOLD

  if (shouldKeepAnimating)
    animationFrameId = requestAnimationFrame(animateToTarget)
  else
    animationFrameId = null
}

function ensureAnimation() {
  if (animationFrameId === null)
    animationFrameId = requestAnimationFrame(animateToTarget)
}

async function updateMousePosition(event: MouseEvent) {
  mousePosition.x = event.clientX
  mousePosition.y = event.clientY

  await updateFloatingPosition()

  ensureAnimation()
}

async function showTooltip(event?: MouseEvent) {
  clearHideTimer()

  if (event)
    await updateMousePosition(event)

  isShown.value = true

  await nextTick()

  await updateFloatingPosition()

  if (!tooltipPosition.x && !tooltipPosition.y) {
    tooltipPosition.x = targetPosition.x
    tooltipPosition.y = targetPosition.y
  }

  ensureAnimation()
}

function scheduleHide() {
  clearHideTimer()

  hideTimer = setTimeout(() => {
    isShown.value = false
    ensureAnimation()
  }, HIDE_TIMER_DELAY)
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
    class="underline decoration-dotted cursor-help"
    @mouseenter="showTooltip"
    @mouseleave="scheduleHide"
    @mousemove="updateMousePosition"
  >
    <slot />

    <span

      i-mynaui-star-solid text-xs text-primary ml-0.5 h2 w2 inline-block dark:text-primary-dark
    />
  </span>

  <Teleport to="body">
    <div
      v-if="isShown"
      ref="tooltipEl"
      class="guide-tooltip-popper"
      :class="{
        'is-bottom': floatingPlacement.startsWith('top'),
      }"
      :style="tooltipStyle"
      @mouseenter="showTooltip()"
      @mouseleave="scheduleHide"
      @click="handleTooltipClick"
    >
      <span
        class="tooltip-content"
        v-html="contentFn()"
      />
    </div>
  </Teleport>
</template>

<style>
.dark .guide-tooltip-popper {
  filter: drop-shadow(0 2px 4px rgba(220, 41, 137, 0.15)) drop-shadow(0 4px 8px rgba(220, 41, 137, 0.15));
}

.guide-tooltip-popper {
  --r: 5px;
  --ah: 11px;
  --aw: 11px;

  box-sizing: border-box;

  position: fixed;
  z-index: 300;

  max-width: 400px;

  border-radius: var(--r);
  border: 1px solid var(--amv-highlight);

  pointer-events: auto;

  --uno: 'font-mono bg-bgr-50/10 dark:bg-bgr-200/10 backdrop-blur-[2px] p2 dark:text-bgr-300';
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15)) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15));

  padding-top: calc(var(--ah) + 8px);

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

.guide-tooltip-popper.is-bottom {
  padding-top: 8px;
  padding-bottom: calc(var(--ah) + 8px);
  border-shape: shape(
    from var(--r) 0,
    hline to calc(100% - var(--r)),
    curve to right var(--r) with right var(--r),
    vline to calc(100% - var(--ah) - var(--r)),
    curve to calc(100% - var(--r)) calc(100% - var(--ah)) with right calc(100% - var(--ah)),
    hline to calc(var(--ap) + var(--aw)),
    line by calc(var(--aw) * -1) var(--ah),
    line by calc(var(--aw) * -1) calc(var(--ah) * -1),
    hline to var(--r),
    curve to left calc(100% - var(--ah) - var(--r)) with left calc(100% - var(--ah)),
    vline to var(--r),
    curve to var(--r) 0 with left var(--r)
  );

  clip-path: shape(
    from var(--r) 0,
    hline to calc(100% - var(--r)),
    curve to right var(--r) with right var(--r),
    vline to calc(100% - var(--ah) - var(--r)),
    curve to calc(100% - var(--r)) calc(100% - var(--ah)) with right calc(100% - var(--ah)),
    hline to calc(var(--ap) + var(--aw)),
    line by calc(var(--aw) * -1) var(--ah),
    line by calc((var(--aw) * -1) - 2px) calc(var(--ah) * -1),
    hline to var(--r),
    curve to left calc(100% - var(--ah) - var(--r)) with left calc(100% - var(--ah)),
    vline to var(--r),
    curve to var(--r) 0 with left var(--r)
  );
}

.guide-tooltip-popper p {
  --uno: text-text-dark;
}

.guide-tooltip-popper p code {
  color: var(--code-color);
}

.guide-tooltip-popper blockquote {
  border-left: 4px solid var(--amv-highlight);
  padding-left: 1rem;
  margin-left: 0;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  color: var(--tk-text-primary);
  opacity: 0.9;
  font-style: italic;
  padding-block: 0.5rem;
  --uno: 'dark:bg-dark';
}

.tooltip-content a {
  color: var(--amv-highlight);
  text-decoration: underline;
}

.tooltip-content a:hover {
  opacity: 0.8;
}

.tooltip-content blockquote {
  margin: 0.5em 0;
  padding-left: 3em;
  border-left: 3px solid var(--amv-highlight);
}
</style>
