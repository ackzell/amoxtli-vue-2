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
}>(), {
  code: '',
  lang: 'vue',
  hide: '',
  showLineNumbers: false,
  showConsole: false,
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
let lunaConsole: any = null
let disposeConsoleThemeWatch: (() => void) | null = null

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
    showError(result.error, '', colorMode.value === 'dark')
  }
  else {
    lastResult.value = { js: result.js, css: result.css }
    render(result.js, result.css, colorMode.value === 'dark', props.showConsole)
  }
}

function refreshPreview() {
  if (lastResult.value)
    render(lastResult.value.js, lastResult.value.css, colorMode.value === 'dark', props.showConsole)
}

function handleReset() {
  if (currentCode.value === originalCode.value)
    return
  currentCode.value = originalCode.value
  if (editor) {
    const model = editor.getModel()
    if (model)
      model.applyEdits([{ range: model.getFullModelRange(), text: originalCode.value }])
  }
  doCompile()
}

function resizeEditor() {
  if (!editor)
    return
  const h = Math.max(60, Math.min(editor.getContentHeight(), 600))
  editorEl.value!.style.height = `${h}px`
  editor.layout()
}

function applyHiddenAreas() {
  if (!props.hide || !editor)
    return
  const ranges = props.hide.split(',').map((part) => {
    const [s, e] = part.trim().split('-').map(Number)
    if (s !== undefined && e !== undefined && !Number.isNaN(s) && !Number.isNaN(e) && s > 0 && e >= s)
      return { startLineNumber: s, startColumn: 1, endLineNumber: e, endColumn: 1 }
    return null
  }).filter((r): r is NonNullable<typeof r> => r !== null)
  if (ranges.length)
    (editor as any).setHiddenAreas(ranges)
}

const theme = computed(() => colorMode.value === 'dark' ? 'vesper' : 'amoxtli-light')

function deserializeMessage(arg: any): any {
  if (arg === null || arg === undefined)
    return arg
  if (typeof arg !== 'object' || !arg.__type)
    return arg
  switch (arg.__type) {
    case 'undefined':
      return undefined
    case 'function': {
      const fn = function () {}
      const fnName = arg.name || 'anonymous'
      const preview = arg.isNative
        ? `function ${fnName}() { [native code] }`
        : `function ${fnName}() { /* source unavailable */ }`
      Object.defineProperty(fn, 'toString', {
        value: () => preview,
        enumerable: false,
        configurable: true,
      })
      ;(fn as any).__preview = preview
      return fn
    }
    case 'symbol':
      return Symbol(arg.description ?? '')
    case 'bigint': {
      try { return BigInt(arg.value) }
      catch { return `BigInt(${arg.value})` }
    }
    case 'date':
      return arg.invalid ? `Invalid Date` : new Date(arg.value)
    case 'regexp':
      return new RegExp(arg.source, arg.flags)
    case 'error': {
      const e = new Error(arg.message)
      e.name = arg.name
      ;(e as any).stack = arg.stack
      return e
    }
    case 'dom':
      return `[DOM ${arg.tagName || 'Unknown'}]`
    case 'array': {
      const items = arg.items?.map(deserializeMessage) ?? []
      if (arg.truncated)
        items.push(`...and ${arg.truncated} more items`)
      return items
    }
    case 'object': {
      const out: Record<string, any> = {}
      for (const key in arg.properties || {}) {
        const prop = arg.properties[key]
        if (prop && 'value' in prop)
          out[key] = deserializeMessage(prop.value)
      }
      if (arg.truncatedProperties)
        out.__truncated__ = `${arg.truncatedProperties} more properties`
      return out
    }
    case 'circular':
      return `[Circular]`
    default:
      return `[Unrecognized ${arg.__type}]`
  }
}

function handleConsoleMessage(event: MessageEvent) {
  if (event.data?.source !== 'nuxt-playground-frame')
    return
  const { method, args } = event.data.payload || {}
  if (method === 'onConsoleLog' && args?.[0]) {
    const { logLevel, data = [] } = args[0] as LogPayload
    const deserialized = data.map(deserializeMessage)
    if (lunaConsole && deserialized.length > 0) {
      const logMethod = lunaConsole[logLevel]
      if (typeof logMethod === 'function')
        logMethod.apply(lunaConsole, deserialized)
    }
  }
}

async function setupConsole() {
  if (!props.showConsole || !consoleEl.value)
    return
  const [lunaModule] = await Promise.all([
    import('luna-console'),
    import('luna-console/luna-console.css'),
  ])
  const LunaConsole = lunaModule.default
  lunaConsole = new LunaConsole(consoleEl.value, {
    theme: colorMode.value === 'dark' ? 'dark' : 'light',
  })
  window.addEventListener('message', handleConsoleMessage)
  disposeConsoleThemeWatch = watch(() => colorMode.value, (mode) => {
    if (lunaConsole)
      lunaConsole.setOption('theme', mode === 'dark' ? 'dark' : 'light')
  })
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
    fontFamily: 'DM Mono, monospace',
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

  if (decoded)
    doCompile()

  await setupConsole()
})

onUnmounted(() => {
  if (compileTimer)
    clearTimeout(compileTimer)
  if (editor)
    editor.dispose()
  window.removeEventListener('message', handleConsoleMessage)
  if (disposeConsoleThemeWatch)
    disposeConsoleThemeWatch()
  lunaConsole = null
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
    border="~ base rounded-lg"
    my-5 overflow-hidden
  >
    <div class="vl-body">
      <div class="vl-right">
        <div class="vl-preview" border="b md:border-b-0 md:border-r base">
          <iframe
            ref="iframeEl"
            class="dark:bg-dark"
            border-none bg-white h-full w-full
            title="Live Preview"
          />
        </div>

        <div v-if="showConsole" class="group/vueLiveConsole relative">
          <div
            ref="consoleEl"
            class="vl-console"
            border="t md:t-0 base"
          />

          <IconButton
            :tooltip="$t('vue-live.clear-console')"
            tooltip-placement="top"
            unstyled border border-base rounded-md bg-base op0 inline-flex size-7 pointer-events-none items-center right-2 top-2 justify-center absolute z-1
            class="transition-opacity duration-200 group-focus-within/vueLiveConsole:op75 group-hover/vueLiveConsole:op75 hover:op100 group-focus-within/vueLiveConsole:pointer-events-auto group-hover/vueLiveConsole:pointer-events-auto"
            aria-label="$t('vue-live.clear-console')"
            @click="lunaConsole.clear()"
          >
            <div i-carbon-clean text-bgr-dark h4 w4 dark:text-bgr-50 />
          </IconButton>
        </div>
      </div>

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
          <div i-carbon-rotate text-bgr-dark h4 w4 dark:text-bgr-50 />
        </IconButton>
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
  min-height: 200px;
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
    min-height: 0;
  }

  .vl-preview {
    flex: 1;
  }
}
</style>
