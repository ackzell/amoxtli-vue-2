<script lang="ts" setup>
import { computed, ref, watchEffect } from 'vue'
import { useToastsStore } from './useToastsStore'

const props = defineProps<YvToastsProps>()

const { activeToasts, toast } = useToastsStore()

interface YvToastsProps {
  /**
   * Number of toasts visible by default
   */
  stackLimit?: number
}

// Store timeout data for each toast
const toastTimers = ref(new Map<string, {
  timeoutId: number
  remainingTime: number
  startTime: number
  originalDuration: number
  stop: () => void
}>())

const defaultDurations = {
  success: 4000,
  error: 6000,
  warning: 5000,
  info: 4000,
}

function getToastIcon(type: string) {
  const icons = {
    success: 'i-mynaui:check-hexagon-solid text-positive-500',
    error: 'i-mynaui:x-hexagon-solid text-negative-500',
    warning: 'i-mynaui:danger-hexagon-solid text-warning-500',
    info: 'i-mynaui:info-hexagon-solid text-info-500',
  }
  return icons[type as keyof typeof icons] || icons.info
}

function getToastClasses(type: string) {
  const classes = {
    success: 'text-positive-500 border-positive-500/30',
    error: 'text-negative-500 border-negative-500/30',
    warning: 'text-warning-500 border-warning-500/30',
    info: 'text-info-500 border-info-500/30',
  }
  return classes[type as keyof typeof classes] || classes.info
}

function handleToastClick(toastId: string) {
  const timer = toastTimers.value.get(toastId)
  if (timer) {
    timer.stop()
    toastTimers.value.delete(toastId)
  }
  toast.dismiss(toastId)
}

function createAutoDissmiss(toastId: string, type: string, duration?: number) {
  const shouldAutoDismiss = duration !== Infinity && duration !== 0
  if (!shouldAutoDismiss)
    return null

  const autoDismissDelay = duration
    || defaultDurations[type as keyof typeof defaultDurations]
    || defaultDurations.info

  const startTime = Date.now()
  const timeoutId = window.setTimeout(() => {
    toast.dismiss(toastId)
    toastTimers.value.delete(toastId)
  }, autoDismissDelay)

  const timer = {
    timeoutId,
    remainingTime: autoDismissDelay,
    startTime,
    originalDuration: autoDismissDelay,
    stop: () => clearTimeout(timeoutId),
  }

  toastTimers.value.set(toastId, timer)
  return timer
}

function pauseAutoDissmiss(toastId: string) {
  const timer = toastTimers.value.get(toastId)
  if (timer) {
    clearTimeout(timer.timeoutId)
    const elapsed = Date.now() - timer.startTime
    timer.remainingTime = Math.max(0, timer.originalDuration - elapsed)
    toastTimers.value.set(toastId, timer)
  }
}

function resumeAutoDissmiss(toastId: string) {
  const timer = toastTimers.value.get(toastId)
  if (timer && timer.remainingTime > 0) {
    timer.startTime = Date.now()
    timer.originalDuration = timer.remainingTime
    timer.timeoutId = window.setTimeout(() => {
      toast.dismiss(toastId)
      toastTimers.value.delete(toastId)
    }, timer.remainingTime)
    timer.stop = () => clearTimeout(timer.timeoutId)
    toastTimers.value.set(toastId, timer)
  }
}

// Watch for changes in active toasts and manage timers
watchEffect(() => {
  const activeToastIds = new Set(activeToasts.map(t => t.id))

  activeToasts.forEach((activeToast) => {
    if (!toastTimers.value.has(activeToast.id)) {
      createAutoDissmiss(
        activeToast.id,
        activeToast.type || 'info',
        activeToast.duration,
      )
    }
  })

  Array.from(toastTimers.value.keys()).forEach((toastId) => {
    if (!activeToastIds.has(toastId)) {
      const timer = toastTimers.value.get(toastId)
      if (timer) {
        timer.stop()
        toastTimers.value.delete(toastId)
      }
    }
  })
})

// --- STACKING LOGIC ---
const stackLimit = computed(() => props.stackLimit ?? 4)
const isStackHovered = ref(false)

const visibleToasts = computed(() => {
  if (isStackHovered.value)
    return activeToasts

  // Always show the newest ones
  return activeToasts.slice(-stackLimit.value)
})

const hiddenCount = computed(() => {
  return Math.max(0, activeToasts.length - visibleToasts.value.length)
})
</script>

<template>
  <div class="z-toasts pointer-events-none left-0 right-0 top-0 fixed">
    <div
      class="p-4 pt-[55px] flex flex-col gap-2 items-center"
      @mouseenter="isStackHovered = true"
      @mouseleave="isStackHovered = false"
    >
      <TransitionGroup
        name="toast"
        tag="div"
        class="text-sm font-mono flex flex-col gap-2 items-center"
      >
        <div
          v-for="activeToast in visibleToasts"
          :key="activeToast.id"
          flex="~ items-center gap-3"
          bg="~ bgr/90 dark:bgr-900/80"
          hover="opacity-100 scale-105"
          un-transition="transition-all duration-200 ease-in-out"
          border="~ border-1 rounded-md"
          class="px2 py2 pointer-events-auto active:scale-98"
          :class="getToastClasses(activeToast.type || 'info')"
          @click="handleToastClick(activeToast.id)"
          @mouseenter="pauseAutoDissmiss(activeToast.id)"
          @mouseleave="resumeAutoDissmiss(activeToast.id)"
        >
          <span
            class="text-sm align-middle inline-block"
            :class="getToastIcon(activeToast.type || 'info')"
          />
          <div class="flex-1">
            <div v-if="activeToast.title" class="font-medium">
              {{ activeToast.title }}
            </div>
            <div
              v-if="activeToast.description"
              class="text-bgr-400 dark:text-bgr-400/90"
              :class="{ 'mt-1': activeToast.title }"
            >
              {{ activeToast.description }}
            </div>
          </div>
        </div>
      </TransitionGroup>

      <div
        v-if="hiddenCount > 0 && !isStackHovered"
        class="text-xs text-bgr cursor-pointer dark:text-bgr-400/90"
        flex="~ items-center gap-1"
      >
        <div i-mynaui-plus inline-block />{{ hiddenCount }}{{ $t(`more`) }}
      </div>
    </div>
  </div>
</template>

<style>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>
