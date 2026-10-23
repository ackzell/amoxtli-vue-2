<script setup lang="ts">
import type { SelectTriggerProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { SelectIcon, SelectTrigger, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<SelectTriggerProps & { class?: HTMLAttributes['class'], size?: 'sm' | 'default' }>(),
  { size: 'default' },
)

const delegatedProps = reactiveOmit(props, 'class', 'size')
const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <SelectTrigger
    data-slot="select-trigger"
    :data-size="size"
    v-bind="forwardedProps"
    :class="cn(
      `data-[placeholder]:text-bgr-500 dark:data-[placeholder]:text-bgr-400
      [&_svg:not([class*='text-'])]:text-bgr-500
      dark:[&_svg:not([class*='text-'])]:text-bgr-400
      focus-visible:border-primary dark:focus-visible:border-primary-dark
      focus-visible:ring-primary/50 dark:focus-visible:ring-primary-dark/50
      aria-invalid:ring-negative/20
      dark:aria-invalid:ring-negative/40
      aria-invalid:border-negative
      bg-bgr-100/60 hover:bg-bgr-100/90
      dark:bg-bgr-800/60 dark:hover:bg-bgr-800/80
      flex w-fit items-center justify-between gap-2
      rounded-md border border-bgr-500/30 dark:border-bgr-600
      px-3 py-2 text-sm whitespace-nowrap
      shadow-xs transition-[color,box-shadow]
      outline-none focus-visible:ring-[3px]
      disabled:cursor-not-allowed disabled:opacity-50
      data-[size=default]:h-9 data-[size=sm]:h-8
      *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex
      *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2
      [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4`,
      props.class,
    )"
  >
    <slot />
    <SelectIcon as-child>
      <div i-mynaui-chevron-down class="opacity-50 size-4" />
    </SelectIcon>
  </SelectTrigger>
</template>
