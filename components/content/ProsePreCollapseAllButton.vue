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
    variant="surface"
    size="icon-sm"
    tooltip="Toggle all code sections"
    tooltip-placement="top"
    op0 pointer-events-none z-1
    class="group-focus-within/avPre:op75 group-hover/avPre:op75 hover:op100 group-focus-within/avPre:pointer-events-auto group-hover/avPre:pointer-events-auto"
    aria-label="Toggle all code sections"
    @click="toggle"
  >
    <div :class="isExpanded ? 'i-mynaui-chevron-down' : 'i-mynaui-chevron-right'" text-bgr-dark h4 w4 dark:text-bgr-50 />
  </IconButton>
</template>
