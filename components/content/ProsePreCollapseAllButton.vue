<script setup lang="ts">
defineProps<{
  hasRanges: boolean
}>()

const emit = defineEmits<{
  expandAll: []
  collapseAll: []
}>()

const isExpanded = ref(false)

function toggle() {
  isExpanded.value = !isExpanded.value
  if (isExpanded.value)
    emit('expandAll')
  else
    emit('collapseAll')
}
</script>

<template>
  <IconButton
    v-if="hasRanges"
    unstyled
    tooltip="Toggle all code sections"
    tooltip-placement="top"
    class="pointer-events-none size-7 inline-flex items-center justify-center border border-base rounded-md bg-base op0 transition-opacity duration-200 group-focus-within:pointer-events-auto group-hover:pointer-events-auto group-focus-within:op75 group-hover:op75 hover:op100"
    aria-label="Toggle all code sections"
    @click="toggle"
  >
    <div :class="isExpanded ? 'i-mynaui-chevron-down' : 'i-mynaui-chevron-right'" h4 w4 text-bgr-dark dark:text-bgr-50 />
  </IconButton>
</template>
