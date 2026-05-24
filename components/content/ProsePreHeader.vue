<script setup lang="ts">
defineProps<{
  filename: string
  iconClass: string
}>()
</script>

<template>
  <div class="px-4 pt-3 border border-b-0 border-base rounded-t-md bg-base flex gap-1.5 items-center">
    <div class="shrink-0 size-4" :class="iconClass" />
    <span class="text-sm/6" data-filename op80>{{ filename }}</span>
  </div>
</template>
