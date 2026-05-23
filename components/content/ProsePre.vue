<script setup lang="ts">
const props = defineProps<{
  code?: string
  language?: string
  filename?: string
  meta?: string
}>()

const attrs = useAttrs()
const preEl = ref<HTMLElement>()

// console.log('[ProsePre] meta is:', props.meta)

const ecInfo = computed(() => `${props.language || ''} ${props.meta || ''}`.trim())

const parsedEc = computed(() => parseEcInfo(ecInfo.value))
const showLineNumbers = computed(() => parsedEc.value.showLineNumbers)

const language = computed(() => {
  const value = (props.language || '').toLowerCase()

  // Determine the filename to derive extension from
  const fileSource = value.startsWith('file:')
    ? parsedEc.value.file.toLowerCase()
    : (parsedEc.value.file || parsedEc.value.title || '').toLowerCase()

  if (fileSource) {
    const ext = fileSource.split('.').pop() || ''
    const extMap: Record<string, string> = {
      vue: 'vue',
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      html: 'html',
      css: 'css',
      scss: 'css',
      json: 'json',
      md: 'markdown',
      py: 'python',
      sh: 'bash',
      yaml: 'yaml',
      yml: 'yaml',
    }
    if (extMap[ext])
      return extMap[ext]
  }

  return value
})

const inferredFilename = computed(() => {
  if (parsedEc.value.title)
    return parsedEc.value.title
  if (parsedEc.value.file)
    return parsedEc.value.file
  if (props.filename)
    return props.filename
  if (props.meta) {
    const match = props.meta.match(/\[([^\]]+)\]/)
    if (match?.[1])
      return match[1]
  }
  return ''
})

const iconClass = computed(() => {
  if (language.value === 'vue')
    return 'i-logos-vue'
  if (language.value === 'ts' || language.value === 'typescript')
    return 'i-logos-typescript-icon'
  if (language.value === 'js' || language.value === 'javascript')
    return 'i-logos-javascript'
  if (language.value === 'html')
    return 'i-logos-html-5'
  if (language.value === 'css')
    return 'i-nonicons-css-16 text-purple'
  if (language.value === 'json')
    return 'i-carbon-json'
  return 'i-logos-code'
})

const preAttrs = computed(() => {
  const { class: _class, ...rest } = attrs as Record<string, unknown>
  return rest
})

const preClass = computed(() => (attrs as Record<string, unknown>).class)

const { applyEcDecorations, resetDecorations, collapseRanges, expandAll, collapseAll } = useEcDecorations(preEl, parsedEc)
const { copied, copyCode } = useCodeCopy()

function handleCopy() {
  copyCode(props.code || preEl.value?.textContent || '')
}

function handleIncreaseFontSize() {
  if (!preEl.value)
    return
  const currentSize = Number.parseFloat(getComputedStyle(preEl.value).fontSize)
  preEl.value.style.fontSize = `${currentSize + 2}px`
}

function handleDecreaseFontSize() {
  if (!preEl.value)
    return
  const currentSize = Number.parseFloat(getComputedStyle(preEl.value).fontSize)
  preEl.value.style.fontSize = `${currentSize - 2}px`
}

onMounted(() => {
  nextTick(() => {
    applyEcDecorations()
  })
})

watch(() => [props.code, props.meta, props.language], resetDecorations)
</script>

<template>
  <div class="group" my-5 max-w-4xl transition-filter relative hover:filter-drop-shadow-md>
    <ProsePreHeader
      v-if="inferredFilename"
      :filename="inferredFilename"
      :icon-class="iconClass"
    />

    <div flex="~ justify-around gap-2" right-4 top-4 absolute z-1>
      <ProsePreCollapseAllButton
        :has-ranges="collapseRanges.length > 0"
        @expand-all="expandAll"
        @collapse-all="collapseAll"
      />

      <ProsePreDecreaseFontSize
        @decrease-font-size="handleDecreaseFontSize"
      />

      <ProsePreIncreaseFontSize
        @increase-font-size="handleIncreaseFontSize"
      />

      <ProsePreCopyButton
        :copied="copied"
        @copy="handleCopy"
      />
    </div>

    <div

      :class="{ 'rounded-t-md': !inferredFilename }" py-4 border border-t-0 border-base rounded-b-md bg-base flex w-full justify-center dark:bg-bgr-dark
    >
      <pre
        ref="preEl"
        mt-0 w-full
        v-bind="preAttrs"
        :class="[
          preClass,
          !showLineNumbers ? 'ec-hide-line-numbers' : '',
          inferredFilename ? 'rounded-t-none! mt-0!' : '',
        ]"
      ><slot /></pre>
    </div>
  </div>
</template>

<style scoped>
pre {
  white-space: pre-wrap;
}

:deep(.prose pre) {
  --uno: p0;
  white-space: pre-wrap;
}

:deep(code) {
  display: block;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}

:deep(code .line) {
  display: block;
  min-height: 1.5rem;
  padding-left: 2.5rem;
  position: relative;
  overflow-wrap: break-word;
}

:deep(code .line::before) {
  content: attr(line);
  position: absolute;
  left: 0;
  width: 2rem;
  text-align: right;
  opacity: 0.45;
}

:deep(pre.ec-hide-line-numbers) {
  --hidden-line-number-spacing: 1rem;
  padding-block: 4px;
}

:deep(pre.ec-hide-line-numbers code .line) {
  padding-left: var(--hidden-line-number-spacing);
}

:deep(pre.ec-hide-line-numbers code .line::before) {
  content: none;
}

:deep(code .line.ec-collapsed) {
  display: none;
}

:deep(code .ec-collapse-range) {
  margin: 0.2rem 0.25rem;
  border-radius: 0.375rem;
  border: 1px solid color-mix(in oklab, currentColor 10%, transparent);
  background: color-mix(in oklab, currentColor 5%, transparent);
}

:deep(code .ec-collapse-range.is-collapsed) {
  background: color-mix(in oklab, currentColor 8%, transparent);
}

:deep(code .ec-collapse-range > .line.ec-collapse-widget) {
  margin: 0.2rem 0;
  padding-right: 0.5rem;
}

:deep(code .ec-collapse-range > .line.ec-collapse-widget::before) {
  opacity: 0.4;
}

:deep(code .line.ec-annotated) {
  background: transparent;
}

:deep(code .line.ec-annotated > .ec-annotated-content) {
  padding-left: 0.25rem;
  display: block;
  background: color-mix(in oklab, var(--amv-highlight) 25%, transparent);
  min-height: 1.5rem;
  margin-right: 1rem;
}

:deep(code .line.ec-annotated > .ec-annotated-content::before) {
  content: '';
  display: block;
  position: absolute;
  left: 2.5rem;
  min-height: 1.5rem;
  top: 0;
  bottom: 0;
  width: 2px;
  background: color-mix(in oklab, var(--amv-highlight) 70%, transparent);
}

:deep(code .ec-annotation-row) {
  display: block;
  margin-left: 2.5rem;
  padding: 0.2rem 0.45rem;
  font-size: 0.75rem;
  line-height: 1.3rem;
  width: fit-content;
  max-width: calc(100% - 2.75rem);
  background: color-mix(in oklab, var(--amv-highlight) 70%, transparent);
}

:deep(pre.ec-hide-line-numbers code .ec-annotation-row) {
  margin-left: var(--hidden-line-number-spacing);
  max-width: calc(100% - 1rem);
}

:deep(pre.ec-hide-line-numbers code .line.ec-annotated > .ec-annotated-content::before) {
  content: '';
  display: block;
  position: absolute;
  left: var(--hidden-line-number-spacing);
  min-height: 1.5rem;
  top: 0;
  bottom: 0;
  width: 2px;
  background: color-mix(in oklab, var(--amv-highlight) 70%, transparent);
}

:deep(code .line.ec-annotation-inline) {
  padding-right: 22rem;
}

:deep(code .line.ec-annotation-inline::after) {
  content: attr(data-ec-note);
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.7rem;
  line-height: 1.2;
  padding: 0.2rem 0.45rem;
  border-radius: 0.375rem;
  max-width: min(20rem, 65%);
  white-space: normal;
  opacity: 0.75;
  background: color-mix(in oklab, currentColor 14%, transparent);
}

:deep(.ec-highlight) {
  color: inherit;
  border: 1px solid var(--amv-highlight);
  background-color: color-mix(in oklab, var(--amv-highlight) 15%, transparent);
  border-radius: 0.25rem;
  padding-block: 0.2rem;
}
</style>
