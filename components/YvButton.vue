<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

interface YvButtonProps {
  class?: HTMLAttributes['class']
  iconClass?: string
}

const props = defineProps<YvButtonProps>()
</script>

<template>
  <button
    :class="cn(`group rounded
    cursor-pointer
    bg-input
    hover:scale-110
    text-xs text-bgr-500
    px-2 py-1 active:scale-100 active:bg-bgr-200 dark:active:bg-bgr-800
    `, props.class)"
    flex="~ items-center gap-1"
  >
    <slot v-if="props.iconClass" name="icon">
      <span
        class="transition-transform duration-200 group-hover:scale-115"
        :class="props.iconClass"

        size-4e align-middle inline-block
      />
    </slot>
    <slot />
  </button>
</template>
