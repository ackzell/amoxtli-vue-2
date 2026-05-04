<script setup lang="ts">
defineProps<{
  copied: boolean
}>()

defineEmits<{
  copy: []
}>()
</script>

<template>
  <IconButton
    unstyled
    tooltip="Copy code to clipboard"
    tooltip-placement="bottom"
    class="absolute right-[11px] top-[11px] z-1 size-7 inline-flex items-center justify-center border border-base rounded-md bg-base op75 transition-opacity duration-200 hover:op100"
    aria-label="Copy code to clipboard"
    @click="$emit('copy')"
  >
    <div :class="copied ? 'i-mynaui-check size-3.5' : 'i-mynaui-copy '" h4 w4 text-bgr-dark dark:text-bgr-50 />
  </IconButton>
</template>
