<script setup lang="ts">
import { AnimatePresence, Motion } from 'motion-v'

defineProps<{
  copied: boolean
}>()

const emit = defineEmits<{
  copy: []
}>()
</script>

<template>
  <IconButton
    unstyled
    tooltip="Copy code to clipboard"
    tooltip-placement="top"
    border border-base rounded-md bg-base op0
    inline-flex size-7 pointer-events-none
    items-center justify-center z-1
    class="transition-opacity duration-200 group-focus-within/avPre:op75 group-hover/avPre:op75 hover:op100 group-focus-within/avPre:pointer-events-auto group-hover/avPre:pointer-events-auto"
    aria-label="Copy code to clipboard"
    @click="emit('copy')"
  >
    <div class="h4 w4 relative">
      <AnimatePresence mode="wait">
        <Motion
          v-if="!copied"
          key="copy"
          as="div"
          :initial="{ opacity: 0, scale: 0.5 }"
          :animate="{ opacity: 1, scale: 1 }"
          :exit="{ opacity: 0, scale: 0.5 }"
          :transition="{ duration: 0.15, ease: 'easeInOut' }"
          class="i-mynaui-copy text-bgr-dark inset-0 absolute dark:text-bgr-50"
        />
        <Motion
          v-else
          key="check"
          as="div"
          :initial="{ opacity: 0, scale: 0.5 }"
          :animate="{ opacity: 1, scale: 1 }"
          :exit="{ opacity: 0, scale: 0.5 }"
          :transition="{ duration: 0.15, ease: 'backOut' }"
          class="i-mynaui-check text-bgr-dark size-3.5 inset-0 absolute dark:text-bgr-50"
        />
      </AnimatePresence>
    </div>
  </IconButton>
</template>
