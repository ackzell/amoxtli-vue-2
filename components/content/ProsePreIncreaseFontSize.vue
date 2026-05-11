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
    class="pointer-events-none z-1 size-7 inline-flex items-center justify-center border border-base rounded-md bg-base op0 transition-opacity duration-200 group-focus-within:pointer-events-auto group-hover:pointer-events-auto group-focus-within:op75 group-hover:op75 hover:op100"
    aria-label="Increase font size"
    @click="$emit('increaseFontSize')"
  >
    <div i-mynaui-a-arrow-up-solid h4 w4 text-bgr-dark dark:text-bgr-50 />
  </IconButton>
</template>
