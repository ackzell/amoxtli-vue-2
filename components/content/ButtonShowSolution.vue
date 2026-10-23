<script setup lang="ts">
const props = defineProps<{
  showSolutionMessage?: string
  resetMessage?: string
}>()
const guide = useGuideStore()

// Challenge lessons use a non-destructive solution "peek" (closing it restores
// the user's own code), so only plain lessons — where both directions of the
// toggle replace the editor contents — need the unsaved-changes confirmation.
async function onClick() {
  const isPeek = !!guide.currentGuide?.validation
  if (!isPeek) {
    const message = guide.showingSolution
      ? 'Saved before resetting the challenge'
      : 'Saved before showing the solution'
    const proceed = await useUnsavedChangesStore().confirmOrDiscard(message)
    if (!proceed)
      return
  }
  guide.toggleSolutions()
}
</script>

<template>
  <!-- class="inline-flex rounded-md px2"
    border="b-1 b-bgr-500/40"
     -->
  <UiButton
    v-if="guide.currentGuide?.solutions"
    type="button"
    variant="ghost"
    size="sm"
    class="text-primary-600 dark:text-primary-dark-300"
    @click="onClick"
  >
    <div v-if="!guide.showingSolution " i-carbon-idea />
    <div v-else i-carbon-rotate-360 />
    {{ guide.showingSolution ? (props.resetMessage ?? guide.buttonResetMessage) : (props.showSolutionMessage ?? guide.buttonSolutionMessage) }}
  </UiButton>
</template>
