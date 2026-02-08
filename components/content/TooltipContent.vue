<script setup lang="ts">
const { id } = defineProps<{ id: string }>()
</script>

<template>
  <!-- keep the rendered HTML in the DOM so the trigger can read it -->
  <span :data-tooltip-id="id" style="position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden">
    <slot />
  </span>
</template>
