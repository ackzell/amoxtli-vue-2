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
    class="group p4 flex-1 min-w-0"
    bg="bgr dark:transparent"
    border="~ base rounded-lg dark:bgr-600"

    hover="bg-bgr-50 dark:bg-bgr-dark border-primary dark:hover:border-primary-dark scale-102 shadow-md"
    h-full block transition-all relative
  >
    <span

      text-lg mb4 inline-flex flex-none h-7 w-7 pointer-events-none transition-colors items-center
      class="group-hover:text-primary dark:group-hover:text-primary-dark"
      :class="icon"
    />
    <div class="text-lg font-semibold my-0 min-w-0 break-words transition-colors group-hover:text-primary dark:group-hover:text-primary-dark">
      {{ title }}
    </div>
    <div v-if="description" class="content-nav-card-description text-[14px] mb-0 mt-1 op50 line-clamp-2">
      {{ description }}
      <slot />
    </div>
    <NuxtLink :to="to" class="inset-0 absolute" />
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
