<script setup lang="ts">
import type { LogPayload } from '~/types/console-output'
import { shikiToMonaco } from '@shikijs/monaco'
import EditorWorker from 'monaco-editor-core/esm/vs/editor/editor.worker?worker'
import { useSandboxPreview } from '~/composables/useSandboxPreview'
import { useSfcCompiler } from '~/composables/useSfcCompiler'
import { vue as vueConfig } from '~/monaco/language-configs'
import { getShiki } from '~/monaco/shiki'

const props = withDefaults(defineProps<{
  code?: string
  lang?: string
  hide?: string
  showLineNumbers?: boolean
  showConsole?: boolean
  showPreview?: boolean
}>(), {
  code: '',
  lang: 'vue',
  hide: '',
  showLineNumbers: false,
  showConsole: false,
  showPreview: true,
})

const colorMode = useColorMode()
const { compileSfc } = useSfcCompiler()
const { iframeEl, blobUrl, render, showError } = useSandboxPreview()

const originalCode = ref('')
const currentCode = ref('')
const lastResult = ref<{ js: string, css: string } | null>(null)
const editorEl = ref<HTMLDivElement>()
const consoleEl = ref<HTMLDivElement>()
let editor: any = null

const consoleOutput = useConsoleOutput()

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
  if (compileTimer) {
    clearTimeout(compileTimer)
  }
  compileTimer = setTimeout(doCompile, 300)
}

function doCompile() {
  const result = compileSfc(currentCode.value)
  lastResult.value = null
  if (result.error) {
    showError(result.error, '', colorMode.value === 'dark')
  }
  else {
    lastResult.value = { js: result.js, css: result.css }
    render(result.js, result.css, colorMode.value === 'dark', props.showConsole)
  }
}

function refreshPreview() {
  if (lastResult.value) {
    render(lastResult.value.js, lastResult.value.css, colorMode.value === 'dark', props.showConsole)
  }
}

function handleReset() {
  if (currentCode.value === originalCode.value) {
    return
  }
  currentCode.value = originalCode.value
  if (editor) {
    const model = editor.getModel()
    if (model) {
      model.applyEdits([{ range: model.getFullModelRange(), text: originalCode.value }])
    }
  }
  doCompile()
}

function resizeEditor() {
  if (!editor) {
    return
  }
  const h = Math.max(60, Math.min(editor.getContentHeight(), 600))
  editorEl.value!.style.height = `${h}px`
  editor.layout()
}

function applyHiddenAreas() {
  if (!props.hide || !editor) {
    return
  }
  const ranges = props.hide.split(',').map((part) => {
    const [s, e] = part.trim().split('-').map(Number)
    if (s !== undefined && e !== undefined && !Number.isNaN(s) && !Number.isNaN(e) && s > 0 && e >= s) {
      return { startLineNumber: s, startColumn: 1, endLineNumber: e, endColumn: 1 }
    }
    return null
  }).filter((r): r is NonNullable<typeof r> => r !== null)
  if (ranges.length) {
    (editor as any).setHiddenAreas(ranges)
  }
}

const theme = computed(() => colorMode.value === 'dark' ? 'vesper' : 'amoxtli-light')

function handleConsoleMessage(event: MessageEvent) {
  if (event.source !== iframeEl.value?.contentWindow) {
    return
  }

  if (event.data?.source !== 'nuxt-playground-frame') {
    return
  }
  const { method, args } = event.data.payload || {}
  if (method === 'onConsoleLog' && args?.[0]) {
    const { logLevel, data = [] } = args[0] as LogPayload
    consoleOutput.addLog(logLevel, data)
  }
}

async function setupConsole() {
  if (!props.showConsole || !consoleEl.value) {
    return
  }
  await consoleOutput.initConsole(consoleEl.value)
  window.addEventListener('message', handleConsoleMessage)
}

onMounted(async () => {
  const decoded = props.code ? decodeBase64(props.code) : ''
  originalCode.value = decoded
  currentCode.value = decoded

  const [monaco] = await Promise.all([
    import('monaco-editor-core/esm/vs/editor/editor.api'),
    import('monaco-editor-core/esm/vs/editor/contrib/codelens/browser/codeLensCache'),
    import('monaco-editor-core/esm/vs/editor/contrib/inlayHints/browser/inlayHintsController'),
    import('monaco-editor-core/esm/vs/editor/contrib/suggest/browser/suggestMemory'),
    import('monaco-editor-core/esm/vs/platform/actionWidget/browser/actionWidget'),
    import('monaco-editor-core/esm/vs/editor/common/services/treeViewsDndService'),
  ])

  ;(window as any).MonacoEnvironment = {
    getWorker() {
      return new EditorWorker()
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
    fontFamily: 'Ubuntu Mono, monospace',
    lineNumbersMinChars: 3,
    lineNumbers: props.showLineNumbers ? 'on' : 'off',
    lineDecorationsWidth: 10,
    renderLineHighlight: 'none',
    guides: {
      indentation: false,
    },
    minimap: { enabled: false },
    folding: false,
    glyphMargin: false,
    automaticLayout: true,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    padding: { top: 16, bottom: 16 },
    overviewRulerLanes: 0,
    fixedOverflowWidgets: true,
  })

  editor.onDidChangeModelContent(() => {
    currentCode.value = editor.getValue()
    scheduleCompile()
  })

  editor.onDidContentSizeChange(() => {
    resizeEditor()
  })

  applyHiddenAreas()
  resizeEditor()

  function handleWheelCapture(e: WheelEvent) {
    const scrollTop = editor.getScrollTop()
    const scrollHeight = editor.getScrollHeight()
    const clientHeight = editor.getLayoutInfo().height
    const atTop = scrollTop <= 0
    const atBottom = scrollTop >= scrollHeight - clientHeight
    const fits = scrollHeight <= clientHeight

    if (fits) {
      e.stopPropagation()
      return
    }

    if (e.deltaY < 0 && atTop) {
      e.stopPropagation()
      return
    }

    if (e.deltaY > 0 && atBottom) {
      e.stopPropagation()
    }
  }
  editorEl.value!.addEventListener('wheel', handleWheelCapture, { capture: true, passive: false })

  if (decoded) {
    doCompile()
  }

  await setupConsole()
})

onUnmounted(() => {
  if (compileTimer) {
    clearTimeout(compileTimer)
  }
  editorEl.value?.removeEventListener('wheel', handleWheelCapture, { capture: true })
  if (editor) {
    editor.dispose()
  }
  window.removeEventListener('message', handleConsoleMessage)
  consoleOutput.destroy()
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
  if (url && currentCode.value) {
    doCompile()
  }
})
</script>

<template>
  <div
    class="vue-live-block"
    border="~ base rounded-lg"
    my-5 overflow-hidden
  >
    <div class="vl-body">
      <div
        ref="editorEl"
        class="vl-editor group/vl-editor group/avVueLive relative"
      >
        <IconButton
          :tooltip="$t('vue-live.reset-contents')"
          tooltip-placement="top"
          unstyled border border-base rounded-md bg-base op0 inline-flex size-7 pointer-events-none items-center right-2 top-2 justify-center absolute z-1
          class="transition-opacity duration-200 group-focus-within/avVueLive:op75 group-hover/avVueLive:op75 hover:op100 group-focus-within/avVueLive:pointer-events-auto group-hover/avVueLive:pointer-events-auto"
          :aria-label="$t('vue-live.reset-contents')"
          @click="handleReset"
        >
          <div i-mynaui-undo text-bgr-dark dark:text-bgr-50 />
        </IconButton>
      </div>

      <div class="vl-right">
        <div v-show="props.showPreview" class="vl-preview group/avVuePreview relative" border="b md:border-b-0 md:border-r base">
          <iframe
            ref="iframeEl"
            class="dark:bg-dark"
            border-none bg-white h-full w-full
            title="Live Preview"
          />
          <IconButton
            :tooltip="$t('vue-live.reload-preview')"
            tooltip-placement="top"
            unstyled border border-base rounded-md bg-base op0 inline-flex size-7 pointer-events-none items-center right-2 top-2 justify-center absolute z-1
            class="transition-opacity duration-200 group-focus-within/avVuePreview:op75 group-hover/avVuePreview:op75 hover:op100 group-focus-within/avVuePreview:pointer-events-auto group-hover/avVuePreview:pointer-events-auto"
            :aria-label="$t('vue-live.reload-preview')"
            @click="doCompile"
          >
            <div i-mynaui-rewind text-bgr-dark dark:text-bgr-50 />
          </IconButton>
        </div>

        <div v-if="showConsole" class="group/vueLiveConsole h-full relative">
          <div
            ref="consoleEl"
            class="vl-console"
            border="t md:t-0 base"
          />

          <IconButton
            v-if="!props.showPreview"
            :tooltip="$t('vue-live.reload-preview')"
            tooltip-placement="top"
            unstyled border border-base rounded-md bg-base op0 inline-flex size-7 pointer-events-none items-center right-12 top-2 justify-center absolute z-1
            class="transition-opacity duration-200 group-focus-within/vueLiveConsole:op75 group-hover/vueLiveConsole:op75 hover:op100 group-focus-within/vueLiveConsole:pointer-events-auto group-hover/vueLiveConsole:pointer-events-auto"
            :aria-label="$t('vue-live.reload-preview')"
            @click="doCompile"
          >
            <div i-mynaui-rewind text-bgr-dark dark:text-bgr-50 />
          </IconButton>

          <IconButton
            :tooltip="$t('vue-live.clear-console')"
            tooltip-placement="top"
            unstyled border border-base rounded-md bg-base op0 inline-flex size-7 pointer-events-none items-center right-2 top-2 justify-center absolute z-1
            class="transition-opacity duration-200 group-focus-within/vueLiveConsole:op75 group-hover/vueLiveConsole:op75 hover:op100 group-focus-within/vueLiveConsole:pointer-events-auto group-hover/vueLiveConsole:pointer-events-auto"
            aria-label="$t('vue-live.clear-console')"
            @click="consoleOutput.clearLogs()"
          >
            <div i-carbon-clean text-bgr-dark h4 w4 dark:text-bgr-50 />
          </IconButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vl-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
}

.vl-editor {
  overflow: hidden;
}

.vl-console {
  height: 150px;
  overflow: auto;
}

@media (min-width: 768px) {
  .vl-body {
    display: grid;
    grid-template-rows: 1fr auto;
    grid-template-columns: 1fr 1fr;
    grid-template-areas: 'editor right';
  }

  .vl-right {
    display: flex;
    flex-direction: column;
    border-left: 1px solid var(--border);
  }

  .vl-preview {
    flex: 1;
    min-height: 66%;
  }

  .vl-console {
    flex: 1;
  }
}
</style>
