<script setup lang="ts">
const props = defineProps<{
  showSolutionMessage?: string
  resetMessage?: string
}>()
const guide = useGuideStore()
</script>

<template>
  <!-- class="inline-flex rounded-md px2"
    border="b-1 b-bgr-500/40"
     -->
  <button
    v-if="guide.currentGuide?.solutions"
    px2 inline-flex
    flex="~ gap-2 items-center"
    hover="dark:bg-bgr-dark/40 dark:text-primary-dark-300 text-primary-600"
    @click="guide.toggleSolutions()"
  >
    <div v-if="!guide.showingSolution " i-carbon-idea />
    <div v-else i-carbon-rotate-360 />
    {{ guide.showingSolution ? (props.resetMessage ?? $t(guide.buttonResetMessage)) : (props.showSolutionMessage ?? $t(guide.buttonSolutionMessage)) }}
  </button>
</template>
