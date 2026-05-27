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
    border border-base rounded-md bg-base op0
    inline-flex size-7 pointer-events-none
    items-center justify-center z-1
    class="transition-opacity duration-200 group-focus-within/avPre:op75 group-hover/avPre:op75 hover:op100 group-focus-within/avPre:pointer-events-auto group-hover/avPre:pointer-events-auto"
    aria-label="Increase font size"
    @click="$emit('increaseFontSize')"
  >
    <div i-mynaui-a-arrow-up-solid text-bgr-dark h4 w4 dark:text-bgr-50 />
  </IconButton>
</template>
