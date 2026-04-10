<script setup lang="ts">
defineProps<{
  to?: string
  icon?: string
  title?: string
  subheader: string
  description?: string
}>()
</script>

<template>
  <div
    flex="~ col"
    class="group min-w-0 flex-1 p4"
    bg="bgr dark:transparent"
    border="~ base rounded-lg dark:bgr-600"
    relative block h-full
    hover="bg-bgr-50 dark:bg-bgr-dark border-primary dark:hover:border-primary-dark scale-102 shadow-md"
    transition-all
  >
    <span
      pointer-events-none
      mb4
      h-7 w-7
      inline-flex flex-none items-center
      text-lg transition-colors
      class="group-hover:text-primary dark:group-hover:text-primary-dark"
      :class="icon"
    />
    <div class="my-0 min-w-0 break-words text-lg font-semibold transition-colors group-hover:text-primary dark:group-hover:text-primary-dark">
      {{ title }}
    </div>
    <div v-if="description" class="content-nav-card-description line-clamp-2 mb-0 mt-1 text-[14px] op50">
      {{ description }}
      <slot />
    </div>
    <NuxtLink :to="to" class="absolute inset-0" />
  </div>
</template>

<style scoped>
.content-nav-card-description {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  overflow-wrap: anywhere;
}
</style>
