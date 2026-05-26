<script setup lang="ts">
const { id } = defineProps<{ id: string }>()
</script>

<template>
  <Teleport :to="`[data-tooltip-content-target='${id}']`" defer>
    <div text-sm p2 rounded-md bg-bgr-50 dark:bg-bgr-900>
      <slot />
    </div>
  </Teleport>
</template>
