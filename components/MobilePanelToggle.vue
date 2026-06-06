<script setup lang="ts">
const ui = useUiState()
const guide = useGuideStore()

const isDocsOnly = computed(() => guide.currentGuide?.features?.defaultLayout === 'docs')

const effectiveViewMode = computed(() => {
  if (isDocsOnly.value)
    return 'docs'
  return ui.mainViewMode
})

const isDocsActive = computed(() => effectiveViewMode.value === 'docs')
const isCodeActive = computed(() => effectiveViewMode.value === 'code')

function showDocs() {
  if (isDocsOnly.value)
    return
  ui.setMainViewMode('docs')
}

function showCode() {
  if (isDocsOnly.value)
    return
  ui.setMainViewMode('code')
}
</script>

<template>
  <div

    flex="~ items-center justify-center gap-4"

    safe-area-pb-toggle

    px3 pt2 border-t border-base bg-base h-auto min-h-12 bottom-0 left-0 right-0 fixed z-50 backdrop-blur-sm
  >
    <button
      flex="~ items-center gap-1.5"
      text-sm px3 py1.5 rounded
      :class="isDocsActive ? 'text-primary bg-active/40 dark:text-primary-dark' : 'hover:bg-active'"
      @click="showDocs"
    >
      <div
        text-lg
        :class="isDocsActive ? 'i-mynaui-book-open-solid' : 'i-mynaui-book-open'"
      />
      <span>{{ $t('docs') }}</span>
    </button>

    <button
      flex="~ items-center gap-1.5"
      text-sm px3 py1.5 rounded
      :disabled="isDocsOnly"
      :class="[
        isCodeActive ? 'text-primary bg-active/40 dark:text-primary-dark' : 'hover:bg-active',
        isDocsOnly ? 'op-30 cursor-not-allowed' : '',
      ]"
      @click="showCode"
    >
      <div i-mynaui-code text-lg />
      <span>{{ $t('code') }}</span>
    </button>
    <small v-if="isDocsOnly" class="text-[0.5rem]"> {{ $t('docs-only-lesson') }}</small>
  </div>
</template>

<style scoped>
.safe-area-pb-toggle {
  padding-bottom: 0.5rem;
  padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
}
</style>
