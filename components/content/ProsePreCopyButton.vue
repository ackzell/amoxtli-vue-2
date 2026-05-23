<script setup lang="ts">
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
    class="border border-base rounded-md bg-base op0 inline-flex size-7 pointer-events-none transition-opacity duration-200 items-center justify-center z-1 group-focus-within:op75 group-hover:op75 hover:op100 group-focus-within:pointer-events-auto group-hover:pointer-events-auto"
    aria-label="Copy code to clipboard"
    @click="emit('copy')"
  >
    <div :class="copied ? 'i-mynaui-check size-3.5' : 'i-mynaui-copy '" text-bgr-dark h4 w4 dark:text-bgr-50 />
  </IconButton>
</template>
