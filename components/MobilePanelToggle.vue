<script setup lang="ts">
const ui = useUiState()
const guide = useGuideStore()

const effectiveViewMode = computed(() => {
  if (guide.features.defaultLayout === 'docs')
    return 'docs'
  return ui.mainViewMode
})

const isDocsActive = computed(() => effectiveViewMode.value === 'docs')
const isCodeActive = computed(() => effectiveViewMode.value === 'code')

function showDocs() {
  if (guide.features.defaultLayout === 'docs')
    return
  ui.setMainViewMode('docs')
}

function showCode() {
  if (guide.features.defaultLayout === 'docs')
    return
  ui.setMainViewMode('code')
}
</script>

<template>
  <div
    fixed bottom-0 left-0 right-0
    h-auto min-h-12
    flex="~ items-center justify-center gap-4"
    px3 pt2
    pb="[max(0.5rem,env(safe-area-inset-bottom))]"
    bg-base border-t border-base
    backdrop-blur-sm
    z-50
  >
    <button
      flex="~ items-center gap-1.5"
      px3 py1.5 rounded text-sm
      :class="isDocsActive ? 'text-primary bg-active/40 dark:text-primary-dark' : 'hover:bg-active'"
      @click="showDocs"
    >
      <div
        text-lg
        :class="isDocsActive ? 'i-mynaui-book-open-solid' : 'i-mynaui-book-open'"
      />
      <span>Docs</span>
    </button>

    <button
      flex="~ items-center gap-1.5"
      px3 py1.5 rounded text-sm
      :class="isCodeActive ? 'text-primary bg-active/40 dark:text-primary-dark' : 'hover:bg-active'"
      @click="showCode"
    >
      <div text-lg i-mynaui-code />
      <span>Code</span>
    </button>
  </div>
</template>
