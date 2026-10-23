<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import type { ButtonVariants } from '@/lib/button-variants'
import { Primitive } from 'reka-ui'
import { buttonVariants } from '@/lib/button-variants'
import { cn } from '@/lib/utils'

type Props = {
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  class?: HTMLAttributes['class']
} & PrimitiveProps

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
})

// Focus target for components that manage focus programmatically (e.g. quiz
// retake). A template ref on a component yields the exposed proxy, so forward
// the two element methods that matter.
const el = ref<{ $el?: HTMLElement } | null>(null)

defineExpose({
  focus: () => el.value?.$el?.focus(),
  blur: () => el.value?.$el?.blur(),
})
</script>

<template>
  <Primitive
    ref="el"
    data-slot="button"
    :as="as"
    :as-child="asChild"
    :class="cn(buttonVariants({ variant, size }), props.class)"
  >
    <slot />
  </Primitive>
</template>
