<script setup lang="ts">
import { shikiToMonaco } from '@shikijs/monaco'
import editorWorker from 'monaco-editor-core/esm/vs/editor/editor.worker?worker'
import { useSandboxPreview } from '~/composables/useSandboxPreview'
import { useSfcCompiler } from '~/composables/useSfcCompiler'
import { vue as vueConfig } from '~/monaco/language-configs'
import { getShiki } from '~/monaco/shiki'

const props = withDefaults(defineProps<{
  code?: string
  lang?: string
  height?: string
}>(), {
  code: '',
  lang: 'vue',
  height: '400px',
})

const colorMode = useColorMode()
const { compileSfc } = useSfcCompiler()
const { iframeEl, vueVersion, blobUrl, render, showError } = useSandboxPreview()

const originalCode = ref('')
const currentCode = ref('')
const lastResult = ref<{ js: string, css: string } | null>(null)
const editorEl = ref<HTMLDivElement>()
let editor: any = null

function decodeBase64(encoded: string): string {
  try {
    return new TextDecoder().decode(
      Uint8Array.from(atob(encoded), c => c.charCodeAt(0)),
    )
  }
  catch {
    return encoded
  }
}

let compileTimer: ReturnType<typeof setTimeout> | null = null

function scheduleCompile() {
  if (compileTimer)
    clearTimeout(compileTimer)
  compileTimer = setTimeout(doCompile, 300)
}

function doCompile() {
  const result = compileSfc(currentCode.value)
  lastResult.value = null
  if (result.error) {
    showError(result.error)
  }
  else {
    lastResult.value = { js: result.js, css: result.css }
    render(result.js, result.css, colorMode.value === 'dark')
  }
}

function refreshPreview() {
  if (lastResult.value)
    render(lastResult.value.js, lastResult.value.css, colorMode.value === 'dark')
}

function handleReset() {
  if (currentCode.value === originalCode.value)
    return
  currentCode.value = originalCode.value
  if (editor)
    editor.setValue(originalCode.value)
  doCompile()
}

const isModified = computed(() => currentCode.value !== originalCode.value)

const theme = computed(() => colorMode.value === 'dark' ? 'vesper' : 'amoxtli-light')

onMounted(async () => {
  const decoded = props.code ? decodeBase64(props.code) : ''
  originalCode.value = decoded
  currentCode.value = decoded

  const monaco = await import('monaco-editor-core/esm/vs/editor/editor.api')

  self.MonacoEnvironment = {
    getWorker() {
      return new editorWorker()
    },
  }

  monaco.languages.register({ id: 'vue', extensions: ['.vue'] })
  monaco.languages.setLanguageConfiguration('vue', vueConfig)

  const shiki = await getShiki()
  shikiToMonaco(shiki, monaco)

  editor = monaco.editor.create(editorEl.value!, {
    value: decoded,
    language: 'vue',
    theme: theme.value,
    fontSize: 13,
    fontFamily: 'DM Mono, monospace',
    lineNumbersMinChars: 3,
    lineNumbers: 'off',
    lineDecorationsWidth: 10,
    minimap: { enabled: false },
    folding: false,
    glyphMargin: false,
    automaticLayout: true,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    padding: { top: 8 },
    overviewRulerLanes: 0,
    fixedOverflowWidgets: true,
  })

  editor.onDidChangeModelContent(() => {
    currentCode.value = editor.getValue()
    scheduleCompile()
  })

  if (decoded)
    doCompile()
})

onUnmounted(() => {
  if (compileTimer)
    clearTimeout(compileTimer)
  if (editor)
    editor.dispose()
})

watch(theme, () => {
  if (editor) {
    import('monaco-editor-core/esm/vs/editor/editor.api').then(m =>
      m.editor.setTheme(theme.value),
    )
  }
  refreshPreview()
})

watch(blobUrl, (url) => {
  if (url && currentCode.value)
    doCompile()
})
</script>

<template>
  <div
    class="vue-live-block"
    :style="{ '--vl-height': height }"
    border="~ base rounded-lg"
    my-5 overflow-hidden
  >
    <!-- <div
      flex="~ items-center gap-2"

      border="b base"
      bg="dark:bgr-dark bgr-50"
      text-sm px-3 py-1.5
    >
      <div i-logos-vue text-sm op60 />
      <span text-xs font-mono op40>
        {{ lang }}
        <span
          v-if="vueVersion"
          v-tooltip="`Vue ${vueVersion}`"
          op30
        > {{ vueVersion }}</span>
      </span>
      <div flex-auto />
      <button
        v-if="originalCode"
        :disabled="!isModified"

        op40 transition-opacity disabled:op-15 hover:op-100
        title="Reset"
        @click="handleReset"
      >
        <div i-carbon-rotate text-sm />
      </button>
    </div> -->

    <div class="vl-body">
      <div class="vl-preview" border="b md:border-b-0 md:border-r base">
        <iframe
          ref="iframeEl"
          class="dark:bg-#1a1a1a"
          border-none bg-white h-full w-full
          title="Live Preview"
        />
      </div>

      <div
        ref="editorEl"
        class="vl-editor"
      />
    </div>
  </div>
</template>

<style scoped>
.vue-live-block {
  --vl-sidebar-min: 200px;
}

.vl-body {
  display: grid;
  grid-template-rows: 45% 55%;
  grid-template-columns: 1fr;
  grid-template-areas:
    'preview'
    'editor';
  height: var(--vl-height);
}

.vl-preview {
  grid-area: preview;
  overflow: hidden;
}

.vl-editor {
  grid-area: editor;
  overflow: hidden;
}

@media (min-width: 768px) {
  .vl-body {
    grid-template-rows: 1fr;
    grid-template-columns: 1fr 1fr;
    grid-template-areas: 'editor preview';
  }
}
</style>
