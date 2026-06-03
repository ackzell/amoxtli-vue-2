<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  useForwardPropsEmits,
} from 'reka-ui'
import { cn } from '@/lib/utils'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<DialogContentProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<DialogContentEmits>()

const delegatedProps = reactiveOmit(props, 'class')

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DialogPortal>
    <DialogOverlay
      data-slot="dialog-overlay"
      class="z-dialog-overlay bg-bgr-dark/40 inset-0 fixed backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0"
    />
    <DialogContent
      data-slot="dialog-content"
      v-bind="{ ...forwarded, ...$attrs }"
      :class="
        cn(
          `z-dialog-content
          bg-bgr-50 dark:bg-bgr-dark
          data-[state=open]:animate-in
          data-[state=closed]:animate-out
          data-[state=closed]:fade-out-0
          data-[state=open]:fade-in-0
          data-[state=closed]:zoom-out-95
          data-[state=open]:zoom-in-95
          fixed top-[50%]
          left-[50%]
          grid w-full
          max-w-[calc(100%-2rem)]
          translate-x-[-50%]
          translate-y-[-50%]
          gap-4
          border border-bgr-700/50
          rounded-lg
          p-6
          shadow-lg
          duration-200
          sm:max-w-lg
          max-h-[calc(100vh-2rem)]
          overflow-y-auto`,
          props.class,
        )
      "
    >
      <slot />
      <DialogClose class="absolute top-4 right-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity">
        <div i-mynaui-x class="size-4" />
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
