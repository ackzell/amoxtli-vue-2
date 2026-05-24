<script setup lang="ts">
import { Splitter } from '@ark-ui/vue'

const mainOrientation = ref<'horizontal' | 'vertical'>('horizontal')
const mainSizes = ref<number[]>([40, 60])
const codeSizes = ref<number[]>([45, 30, 25])

const mainPanels = [
  { id: 'docs-panel', minSize: 0, maxSize: 100, collapsible: true, collapsedSize: 0 },
  { id: 'code-panel', minSize: 0, maxSize: 100, collapsible: true, collapsedSize: 0 },
]

const codePanels = [
  { id: 'editor-panel', minSize: 0, maxSize: 100, collapsible: true, collapsedSize: 0 },
  { id: 'preview-panel', minSize: 0, maxSize: 100, collapsible: true, collapsedSize: 0 },
  { id: 'console-panel', minSize: 0, maxSize: 100, collapsible: true, collapsedSize: 0 },
]

const showDocs = computed(() => (mainSizes.value[0] ?? 0) > 0)
const showCode = computed(() => (mainSizes.value[1] ?? 0) > 0)

function setMainSizes(a: number, b: number) {
  mainSizes.value = [a, b]
}

function showSplitMode() {
  setMainSizes(40, 60)
}

function showDocsOnly() {
  setMainSizes(100, 0)
}

function showCodeOnly() {
  setMainSizes(0, 100)
}

function resetNested() {
  codeSizes.value = [45, 30, 25]
}

function onMainResizeEnd(details: { size: number[] }) {
  mainSizes.value = [...details.size]
}

function onCodeResizeEnd(details: { size: number[] }) {
  codeSizes.value = [...details.size]
}

function onMainResize(details: { size: number[] }) {
  mainSizes.value = [...details.size]
}

function onCodeResize(details: { size: number[] }) {
  codeSizes.value = [...details.size]
}
</script>

<template>
  <!-- eslint-disable @intlify/vue-i18n/no-raw-text -->
  <main grid="~ rows-[max-content_1fr]" bg-base h-screen w-screen of-hidden>
    <header border="b base" p4 flex="~ wrap items-center gap-2">
      <strong text-base>Ark Splitter Spike</strong>
      <button border="~ base" text-sm px3 py1 rounded hover:bg-active @click="mainOrientation = mainOrientation === 'horizontal' ? 'vertical' : 'horizontal'">
        Main: {{ mainOrientation }}
      </button>
      <button border="~ base" text-sm px3 py1 rounded hover:bg-active @click="showSplitMode">
        Split mode
      </button>
      <button border="~ base" text-sm px3 py1 rounded hover:bg-active @click="showDocsOnly">
        Docs only
      </button>
      <button border="~ base" text-sm px3 py1 rounded hover:bg-active @click="showCodeOnly">
        Code only
      </button>
      <button border="~ base" text-sm px3 py1 rounded hover:bg-active @click="resetNested">
        Reset nested
      </button>
      <div text-xs ml-auto op70>
        docs: {{ showDocs ? 'visible' : 'hidden' }} | code: {{ showCode ? 'visible' : 'hidden' }}
      </div>
    </header>

    <Splitter.Root
      :panels="mainPanels"
      :orientation="mainOrientation"
      :size="mainSizes"
      h-full
      w-full
      @resize="onMainResize" @resize-end="onMainResizeEnd"
    >
      <Splitter.Panel id="docs-panel" border="r base" p4>
        <div border="~ base" p4 rounded h-full>
          <h2 text-sm font-bold mb2>
            Docs Panel
          </h2>
          <p text-sm op80>
            Top-level panel used to validate docs/code focus modes, orientation swaps, keyboard resize,
            and drag behavior.
          </p>
        </div>
      </Splitter.Panel>

      <Splitter.ResizeTrigger id="docs-panel:code-panel" bg="gray/10" h2 w2>
        <Splitter.ResizeTriggerIndicator h-8 w-0.5 bg="gray/40" />
      </Splitter.ResizeTrigger>

      <Splitter.Panel id="code-panel" p2>
        <Splitter.Root
          :panels="codePanels"
          orientation="vertical"
          :size="codeSizes"
          h-full
          w-full
          @resize="onCodeResize" @resize-end="onCodeResizeEnd"
        >
          <Splitter.Panel id="editor-panel" p2>
            <div border="~ base" p4 rounded h-full>
              <h3 text-sm font-bold mb2>
                Editor
              </h3>
              <p text-sm op70>
                Placeholder for editor pane.
              </p>
            </div>
          </Splitter.Panel>

          <Splitter.ResizeTrigger id="editor-panel:preview-panel" bg="gray/10" w2>
            <Splitter.ResizeTriggerIndicator h-8 w-0.5 bg="gray/40" />
          </Splitter.ResizeTrigger>

          <Splitter.Panel id="preview-panel" p2>
            <div border="~ base" p4 rounded h-full>
              <h3 text-sm font-bold mb2>
                Preview
              </h3>
              <p text-sm op70>
                Placeholder for preview pane.
              </p>
            </div>
          </Splitter.Panel>

          <Splitter.ResizeTrigger id="preview-panel:console-panel" bg="gray/10" w2>
            <Splitter.ResizeTriggerIndicator h-8 w-0.5 bg="gray/40" />
          </Splitter.ResizeTrigger>

          <Splitter.Panel id="console-panel" p2>
            <div border="~ base" p4 rounded h-full>
              <h3 text-sm font-bold mb2>
                Console / Terminal
              </h3>
              <p text-sm op70>
                Combined placeholder for lower output area.
              </p>
            </div>
          </Splitter.Panel>
        </Splitter.Root>
      </Splitter.Panel>
    </Splitter.Root>
  </main>
  <!-- eslint-enable @intlify/vue-i18n/no-raw-text -->
</template>
