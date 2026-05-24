<script setup lang="ts">
defineEmits<{
  increaseFontSize: []
}>()
</script>

<template>
  <IconButton
    unstyled
    tooltip="Increase font size"
    tooltip-placement="top"
    class="border border-base rounded-md bg-base op0 inline-flex size-7 pointer-events-none transition-opacity duration-200 items-center justify-center z-1 group-focus-within:op75 group-hover:op75 hover:op100 group-focus-within:pointer-events-auto group-hover:pointer-events-auto"
    aria-label="Increase font size"
    @click="$emit('increaseFontSize')"
  >
    <div i-mynaui-a-arrow-up-solid text-bgr-dark h4 w4 dark:text-bgr-50 />
  </IconButton>
</template>
