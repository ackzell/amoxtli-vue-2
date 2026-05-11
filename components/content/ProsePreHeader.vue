<script setup lang="ts">
defineProps<{
  filename: string
  iconClass: string
}>()
</script>

<template>
  <div class="flex items-center gap-1.5 border border-b-0 border-base rounded-t-md bg-base px-4 pt-3 shadow-md">
    <div class="size-4 shrink-0" :class="iconClass" />
    <span class="text-sm/6" op80>{{ filename }}</span>
  </div>
</template>
