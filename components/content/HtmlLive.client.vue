<script setup lang="ts">
import type { LogPayload } from '~/types/console-output'
import { shikiToMonaco } from '@shikijs/monaco'
import { ensureMonacoEnvironment } from '~/monaco/environment'
import { html as htmlConfig } from '~/monaco/language-configs'
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
  lang: 'html',
  hide: '',
  showLineNumbers: false,
  showConsole: false,
  showPreview: true,
})

const colorMode = useColorMode()
const { iframeEl, renderHtml } = useHtmlSandboxPreview()

const originalCode = ref('')
const currentCode = ref('')
const editorEl = ref<HTMLDivElement>()
const consoleEl = ref<HTMLDivElement>()
let editor: any = null

const consoleOutput = useConsoleOutput({ withDomReconstruction: true })

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

let renderTimer: ReturnType<typeof setTimeout> | null = null

function scheduleRender() {
  if (renderTimer) {
    clearTimeout(renderTimer)
  }
  renderTimer = setTimeout(doRender, 300)
}

function doRender() {
  const srcdoc = renderHtml(
    currentCode.value,
    colorMode.value === 'dark',
  )
  if (iframeEl.value) {
    iframeEl.value.srcdoc = srcdoc
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
  doRender()
}

function resizeEditor() {
  if (!editor) {
    return
  }
  const h = Math.max(60, Math.min(editor.getContentHeight(), 600))
  editorEl.value!.style.minHeight = `${h}px`
  editor.layout()
}

function applyHiddenAreas() {
  if (!props.hide || !editor) {
    return
  }
  const ranges = props.hide.split(',').map((part) => {
    const [s, e] = part.trim().split('-').map(Number)
    const end = e ?? s
    if (s !== undefined && end !== undefined && !Number.isNaN(s) && !Number.isNaN(end) && s > 0 && end >= s) {
      return { startLineNumber: s, startColumn: 1, endLineNumber: end, endColumn: 1 }
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

  ensureMonacoEnvironment()

  monaco.languages.register({ id: 'html', extensions: ['.html'] })
  monaco.languages.setLanguageConfiguration('html', htmlConfig)

  const shiki = await getShiki()
  shikiToMonaco(shiki, monaco)

  editor = monaco.editor.create(editorEl.value!, {
    value: decoded,
    language: 'html',
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
    scheduleRender()
  })

  editor.onDidContentSizeChange(() => {
    resizeEditor()
  })

  applyHiddenAreas()
  resizeEditor()

  editorEl.value!.addEventListener('wheel', handleWheelCapture, { capture: true, passive: false })

  if (decoded) {
    doRender()
  }

  await setupConsole()
})

onUnmounted(() => {
  if (renderTimer) {
    clearTimeout(renderTimer)
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
  doRender()
})
</script>

<template>
  <div
    class="html-live-block"
    border="~ base rounded-lg"
    my-5 overflow-hidden
  >
    <div class="hl-title" border="b base" bg="base dark:bgr-dark" flex="~ gap-1.5" px-4 pb-2 pt-3 items-center>
      <div aria-hidden="true" class="i-logos-html-5 shrink-0 size-4" />
      <span class="text-sm/6 op80">{{ $t('html-live.title') }}</span>
    </div>
    <div class="hl-body">
      <div
        ref="editorEl"
        class="hl-editor group/hl-editor group/avHtmlLive relative"
      >
        <IconButton
          :tooltip="$t('html-live.reset-contents')"
          tooltip-placement="top"
          unstyled border border-base rounded-md bg-base op0 inline-flex size-7 pointer-events-none items-center right-2 top-2 justify-center absolute z-1
          class="transition-opacity duration-200 group-focus-within/avHtmlLive:op75 group-hover/avHtmlLive:op75 hover:op100 group-focus-within/avHtmlLive:pointer-events-auto group-hover/avHtmlLive:pointer-events-auto"
          :aria-label="$t('html-live.reset-contents')"
          @click="handleReset"
        >
          <div i-mynaui-undo text-bgr-dark dark:text-bgr-50 />
        </IconButton>
      </div>

      <div class="hl-right">
        <div v-show="props.showPreview" class="hl-preview group/avHtmlPreview relative" border="b md:border-b-0 md:border-r base">
          <iframe
            ref="iframeEl"
            class="dark:bg-dark"
            border-none bg-white h-full w-full
            title="Live Preview"
          />
          <IconButton
            :tooltip="$t('html-live.reload-preview')"
            tooltip-placement="top"
            unstyled border border-base rounded-md bg-base op0 inline-flex size-7 pointer-events-none items-center right-2 top-2 justify-center absolute z-1
            class="transition-opacity duration-200 group-focus-within/avHtmlPreview:op75 group-hover/avHtmlPreview:op75 hover:op100 group-focus-within/avHtmlPreview:pointer-events-auto group-hover/avHtmlPreview:pointer-events-auto"
            :aria-label="$t('html-live.reload-preview')"
            @click="doRender"
          >
            <div i-mynaui-rewind text-bgr-dark dark:text-bgr-50 />
          </IconButton>
        </div>

        <div v-if="showConsole" class="group/htmlLiveConsole h-full relative">
          <div
            ref="consoleEl"
            class="hl-console"
            border="t md:t-0 base"
          />

          <IconButton
            v-if="!props.showPreview"
            :tooltip="$t('html-live.reload-preview')"
            tooltip-placement="top"
            unstyled border border-base rounded-md bg-base op0 inline-flex size-7 pointer-events-none items-center right-12 top-2 justify-center absolute z-1
            class="transition-opacity duration-200 group-focus-within/htmlLiveConsole:op75 group-hover/htmlLiveConsole:op75 hover:op100 group-focus-within/htmlLiveConsole:pointer-events-auto group-hover/htmlLiveConsole:pointer-events-auto"
            :aria-label="$t('html-live.reload-preview')"
            @click="doRender"
          >
            <div i-mynaui-rewind text-bgr-dark dark:text-bgr-50 />
          </IconButton>

          <IconButton
            tooltip-placement="top"
            unstyled border border-base rounded-md bg-base op0 inline-flex size-7 pointer-events-none items-center right-2 top-2 justify-center absolute z-1
            class="transition-opacity duration-200 group-focus-within/htmlLiveConsole:op75 group-hover/htmlLiveConsole:op75 hover:op100 group-focus-within/htmlLiveConsole:pointer-events-auto group-hover/htmlLiveConsole:pointer-events-auto"
            z-100
            :tooltip="$t('html-live.clear-console')"
            :aria-label="$t('html-live.clear-console')"
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
.hl-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
}

.hl-editor {
  overflow: hidden;
  height: 100%;
}

.hl-console {
  min-height: 150px;
  max-height: 200px;
  overflow: auto;
}

@media (min-width: 768px) {
  .hl-body {
    display: grid;
    grid-template-rows: 1fr auto;
    grid-template-columns: 1fr 1fr;
    grid-template-areas: 'editor right';
  }

  .hl-right {
    display: flex;
    flex-direction: column;
    border-left: 1px solid var(--border);
  }

  .hl-preview {
    flex: 1;
    min-height: 66%;
  }

  .hl-console {
    flex: 1;
  }
}
</style>
