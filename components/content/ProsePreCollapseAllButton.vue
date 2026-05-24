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
    class="border border-base rounded-md bg-base op0 inline-flex size-7 pointer-events-none transition-opacity duration-200 items-center justify-center group-focus-within:op75 group-hover:op75 hover:op100 group-focus-within:pointer-events-auto group-hover:pointer-events-auto"
    aria-label="Toggle all code sections"
    @click="toggle"
  >
    <div :class="isExpanded ? 'i-mynaui-chevron-down' : 'i-mynaui-chevron-right'" text-bgr-dark h4 w4 dark:text-bgr-50 />
  </IconButton>
</template>
