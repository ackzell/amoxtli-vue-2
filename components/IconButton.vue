<script setup lang="ts">
import type { Placement } from 'floating-vue'
import type { ButtonVariants } from '@/lib/button-variants'
import { buttonVariants, toolbarButtonClass } from '@/lib/button-variants'

interface IconButtonTooltipOptions {
  content: string
  placement: Placement
  theme: 'icon-button-tooltip'
}

const props = withDefaults(defineProps<{
  tooltip?: string
  tooltipPlacement?: Placement
  active?: boolean
  padding?: 'sm' | 'md'
  unstyled?: boolean
  ariaLabel?: string
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
}>(), {
  tooltip: undefined,
  tooltipPlacement: 'top',
  active: false,
  padding: 'md',
  unstyled: false,
  ariaLabel: undefined,
  variant: undefined,
  size: undefined,
})

const tooltipOptions = computed<IconButtonTooltipOptions | undefined>(() => {
  if (!props.tooltip)
    return undefined

  return {
    content: props.tooltip,
    placement: props.tooltipPlacement,
    theme: 'icon-button-tooltip',
  }
})

// A `variant` switches this icon button onto the shared `buttonVariants`
// system (press scale, focus ring, transitions, disabled) — used by the
// code-block controls. Without one it uses the fixed toolbar styling.
const styling = computed(() => {
  if (props.unstyled)
    return undefined
  if (props.variant)
    return buttonVariants({ variant: props.variant, size: props.size })
  return [
    toolbarButtonClass,
    'rounded',
    props.padding === 'sm' ? 'p1' : 'p2',
    props.active ? 'text-primary bg-active/40 dark:text-primary-dark' : '',
  ].filter(Boolean).join(' ')
})
</script>

<template>
  <button
    v-tooltip="tooltipOptions"
    type="button"
    class="shrink-0"
    :aria-label="props.ariaLabel || props.tooltip"
    :class="styling"
  >
    <slot />
  </button>
</template>
