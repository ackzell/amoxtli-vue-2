<script setup lang="ts">
import type { PopoverContentEmits, PopoverContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import {
  PopoverContent,

  PopoverPortal,
  useForwardPropsEmits,
} from 'reka-ui'
import { cn } from '@/lib/utils'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<PopoverContentProps & { class?: HTMLAttributes['class'] }>(),
  {
    align: 'center',
    sideOffset: 4,
  },
)
const emits = defineEmits<PopoverContentEmits>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <PopoverPortal>
    <PopoverContent
      data-slot="popover-content"
      v-bind="{ ...forwarded, ...$attrs }"
      :class="
        cn(
          `bg-background relative
           text-bgr-700 dark:text-bgr-300
           bg-bgr-50 dark:bg-bgr-dark
           data-[state=open]:animate-in
           data-[state=closed]:animate-out
           data-[state=closed]:fade-out-0
           data-[state=open]:fade-in-0
           data-[state=closed]:zoom-out-95
           data-[state=open]:zoom-in-95
           data-[side=bottom]:slide-in-from-top-2
           data-[side=left]:slide-in-from-right-2
           data-[side=right]:slide-in-from-left-2
           data-[side=top]:slide-in-from-bottom-2
           z-[103] w-72 rounded-md border dark:border-bgr-700 p-4
           shadow-md origin-(--reka-popover-content-transform-origin)
           outline-hidden`,
          props.class,
        )
      "
    >
      <slot />
    </PopoverContent>
  </PopoverPortal>
</template>

<style>
/**
  todo: follow up on the animations
  somehow, this animates the popover but also the select
*/

[data-state='open'] {
  animation-duration: 200ms !important;
}

[data-state='closed'] {
  animation-duration: 200ms !important;
}
</style>
