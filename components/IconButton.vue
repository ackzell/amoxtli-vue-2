<script setup lang="ts">
import type { Placement } from 'floating-vue'

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
}>(), {
  tooltip: undefined,
  tooltipPlacement: 'top',
  active: false,
  padding: 'md',
  unstyled: false,
  ariaLabel: undefined,
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
</script>

<template>
  <button
    v-tooltip="tooltipOptions"
    type="button"
    :aria-label="props.ariaLabel || props.tooltip"
    :class="[
      props.unstyled ? '' : 'rounded hover:bg-active',
      props.unstyled ? '' : (props.padding === 'sm' ? 'p1' : 'p2'),
      props.unstyled ? '' : (props.active ? 'text-primary bg-active/40 dark:text-primary-dark' : ''),
    ]"
  >
    <slot />
  </button>
</template>
