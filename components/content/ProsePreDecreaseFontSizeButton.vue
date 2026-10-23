<script setup lang="ts">
defineEmits<{
  decreaseFontSize: []
}>()
</script>

<template>
  <IconButton
    variant="surface"
    size="icon-sm"
    tooltip="Decrease font size"
    tooltip-placement="top"
    op0 pointer-events-none z-1
    class="group-focus-within/avPre:op75 group-hover/avPre:op75 hover:op100 group-focus-within/avPre:pointer-events-auto group-hover/avPre:pointer-events-auto"
    aria-label="Decrease font size"
    @click="$emit('decreaseFontSize')"
  >
    <div i-mynaui-a-arrow-down-solid text-bgr-dark h4 w4 dark:text-bgr-50 />
  </IconButton>
</template>
