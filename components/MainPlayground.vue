<script setup lang="ts">
import type { CodePanelId, LayoutLeaf } from '~/types/layout'
import { Splitter } from '@ark-ui/vue'
import { useLayoutDrag } from '~/composables/useLayoutDrag'
import PanelConsole from './PanelConsole.client.vue'

const ui = useUiState()
const guide = useGuideStore()

const route = useRoute()

const lessonForcesDocsOnly = computed(() => guide.currentGuide?.layout?.docsOnly === true)
const effectiveMainViewMode = computed(() => {
  if (lessonForcesDocsOnly.value)
    return 'docs'
  return ui.mainViewMode
})
const isSplitMode = computed(() => effectiveMainViewMode.value === 'split')
const isCodeOnlyMode = computed(() => effectiveMainViewMode.value === 'code')
const isDocsOnlyMode = computed(() => effectiveMainViewMode.value === 'docs')

const mainFlexDirection = computed(() => {
  if (ui.mainLayoutOrientation === 'horizontal')
    return ui.mainLayoutReverse ? 'row-reverse' : 'row'
  return ui.mainLayoutReverse ? 'column-reverse' : 'column'
})

const codeFlexDirection = computed(() =>
  ui.layoutTree.direction === 'horizontal' ? 'row' : 'column',
)

const COLLAPSED_VISIBLE_SIZE = 6

const mainPanels = [
  { id: 'docs-panel', minSize: 0, maxSize: 100, collapsible: true, collapsedSize: 0 },
  { id: 'code-panel', minSize: 0, maxSize: 100, collapsible: true, collapsedSize: 0 },
]

const outputVisible = computed(() => ui.showPreview || ui.showConsole)
const outputHasBothPanels = computed(() => ui.showPreview && ui.showConsole)
const codeVisiblePanels = computed<CodePanelId[]>(() => {
  const visibleById: Record<CodePanelId, boolean> = {
    editor: true,
    output: outputVisible.value,
    terminal: ui.showTerminal,
  }

  return (ui.layoutTree.children as LayoutLeaf[])
    .filter(n => n.type === 'panel')
    .map(n => n.id)
    .filter(id => visibleById[id])
})

const { draggedPanel, startDrag, endDrag } = useLayoutDrag()
const isDragging = computed(() => draggedPanel.value !== null)
const dropTarget = ref<string | null>(null)

const panelLabels: Record<CodePanelId, string> = {
  editor: 'Editor',
  output: 'Output',
  terminal: 'Terminal',
}

function onDropOnPanel(target: CodePanelId) {
  if (draggedPanel.value)
    ui.movePanel(draggedPanel.value, target)
  dropTarget.value = null
  endDrag()
}

function onDropAtEnd() {
  if (draggedPanel.value)
    ui.movePanel(draggedPanel.value, null)
  dropTarget.value = null
  endDrag()
}

function onDropAfter(index: number) {
  if (index >= codeVisiblePanels.value.length - 1) {
    onDropAtEnd()
    return
  }

  const nextPanel = codeVisiblePanels.value[index + 1]
  if (!nextPanel) {
    onDropAtEnd()
    return
  }

  onDropOnPanel(nextPanel)
}

function getPanelSlotDropTarget(index: number, event: DragEvent) {
  const element = event.currentTarget as HTMLElement | null
  if (!element)
    return `__after_${index}`

  const rect = element.getBoundingClientRect()
  if (codeFlexDirection.value === 'column') {
    const halfwayY = rect.top + rect.height / 2
    return event.clientY < halfwayY ? `__before_${index}` : `__after_${index}`
  }

  const halfwayX = rect.left + rect.width / 2
  return event.clientX < halfwayX ? `__before_${index}` : `__after_${index}`
}

function onPanelSlotDragOver(index: number, event: DragEvent) {
  dropTarget.value = getPanelSlotDropTarget(index, event)
}

function onDropOnPanelSlot(panel: CodePanelId, index: number, event: DragEvent) {
  const target = getPanelSlotDropTarget(index, event)
  if (target === `__before_${index}`)
    onDropOnPanel(panel)
  else
    onDropAfter(index)
}

const codePanels = computed(() => {
  return codeVisiblePanels.value.map((panel) => {
    const isEditor = panel === 'editor'
    return {
      id: panelIdByKey[panel],
      minSize: 0,
      maxSize: 100,
      collapsible: true,
      collapsedSize: isEditor ? 0 : COLLAPSED_VISIBLE_SIZE,
    }
  })
})

const outputPanels = computed(() => {
  const panels = []

  if (ui.showPreview) {
    panels.push({
      id: 'preview-panel',
      minSize: 0,
      maxSize: 100,
      collapsible: true,
      collapsedSize: COLLAPSED_VISIBLE_SIZE,
    })
  }

  if (ui.showConsole) {
    panels.push({
      id: 'console-panel',
      minSize: 0,
      maxSize: 100,
      collapsible: true,
      collapsedSize: COLLAPSED_VISIBLE_SIZE,
    })
  }

  return panels
})

const embeddedPanels = [
  { id: 'embedded-docs-panel', minSize: 0, maxSize: 100, collapsible: true, collapsedSize: 0 },
  { id: 'embedded-spacer-panel', minSize: 0, maxSize: 100, collapsible: true, collapsedSize: 0 },
]

const mainSizes = computed<number[]>({
  get() {
    if (isCodeOnlyMode.value)
      return [0, 100]
    if (isDocsOnlyMode.value)
      return [100, 0]
    return [ui.panelDocs, Math.max(0, 100 - ui.panelDocs)]
  },
  set(value) {
    if (!isSplitMode.value)
      return
    ui.panelDocs = value[0] ?? 0
  },
})

const codeSizes = computed<number[]>({
  get() {
    const outputSize = outputVisible.value ? ui.panelOutput : 0
    const terminalSize = ui.showTerminal
      ? Math.max(0, 100 - ui.panelEditor - outputSize)
      : 0

    const sizeByPanel: Record<CodePanelId, number> = {
      editor: ui.panelEditor,
      output: outputSize,
      terminal: terminalSize,
    }

    return codeVisiblePanels.value.map(panel => sizeByPanel[panel])
  },
  set(value) {
    for (const [index, panel] of codeVisiblePanels.value.entries()) {
      const next = value[index] ?? 0
      if (panel === 'editor')
        ui.panelEditor = next
      else if (panel === 'output')
        ui.panelOutput = next
    }
  },
})

const outputSizes = computed<number[]>({
  get() {
    if (outputHasBothPanels.value)
      return [ui.panelPreview, Math.max(0, 100 - ui.panelPreview)]
    if (ui.showPreview)
      return [100]
    if (ui.showConsole)
      return [100]
    return []
  },
  set(value) {
    if (!outputHasBothPanels.value)
      return

    const nextPreview = Math.min(100, Math.max(0, value[0] ?? 0))
    ui.panelPreview = nextPreview
  },
})

const terminalVisible = computed(() => ui.showTerminal)
const panelIdByKey: Record<CodePanelId, string> = {
  editor: 'editor-panel',
  output: 'output-panel',
  terminal: 'terminal-panel',
}
const codeTriggerIds = computed<`${string}:${string}`[]>(() => {
  const ids = codeVisiblePanels.value.map(panel => panelIdByKey[panel])
  const triggers: `${string}:${string}`[] = []
  for (let index = 0; index < ids.length - 1; index++)
    triggers.push(`${ids[index]}:${ids[index + 1]}`)
  return triggers
})
const outputTriggerId: `${string}:${string}` = 'preview-panel:console-panel'

function onResizeStart() {
  ui.isPanelDragging = true
}

function onMainResize(details: { size: number[] }) {
  mainSizes.value = details.size
}

function onMainResizeEnd(details: { size: number[] }) {
  mainSizes.value = details.size
  ui.isPanelDragging = false
}

function onCodeResize(details: { size: number[] }) {
  codeSizes.value = details.size
}

function onCodeResizeEnd(details: { size: number[] }) {
  codeSizes.value = details.size
  ui.isPanelDragging = false
}

function onOutputResize(details: { size: number[] }) {
  outputSizes.value = details.size
}

function onOutputResizeEnd(details: { size: number[] }) {
  outputSizes.value = details.size
  ui.isPanelDragging = false
}

function onEmbeddedResize(details: { size: number[] }) {
  mainSizes.value = details.size
}

function onEmbeddedResizeEnd(details: { size: number[] }) {
  mainSizes.value = details.size
  ui.isPanelDragging = false
}
</script>

<template>
  <Splitter.Root
    :panels="mainPanels"
    :orientation="ui.mainLayoutOrientation"
    :size="mainSizes"
    :style="{ flexDirection: mainFlexDirection }"
    h-full of-hidden
    @resize-start="onResizeStart"
    @resize="onMainResize"
    @resize-end="onMainResizeEnd"
  >
    <Splitter.Panel id="docs-panel">
      <PanelDocs v-if="!isCodeOnlyMode" :key="route.path" />
    </Splitter.Panel>

    <Splitter.ResizeTrigger v-if="isSplitMode" id="docs-panel:code-panel" />

    <Splitter.Panel id="code-panel">
      <div v-if="!isDocsOnlyMode" h-full grid="~ rows-[max-content_1fr]">
        <PanelCodeToolbar />
        <div relative min-h-0 of-hidden>
          <Splitter.Root
            :panels="codePanels"
            :orientation="ui.layoutTree.direction"
            :size="codeSizes"
            :style="{ flexDirection: codeFlexDirection }"
            h-full w-full of-hidden
            :class="guide.embeddedDocs ? 'z-embedded-docs-raised' : ''"
            @resize-start="onResizeStart"
            @resize="onCodeResize"
            @resize-end="onCodeResizeEnd"
          >
            <template v-for="(panel, index) in codeVisiblePanels" :key="panel">
              <Splitter.Panel :id="panelIdByKey[panel]">
                <div relative h-full>
                  <div

                    absolute right-1 top-1 z-60 h-7 border border-base rounded px1.5
                    flex="~ items-center gap-1"
                    class="bg-base/85 cursor-grab select-none text-xs"
                    title="Drag this panel to reorder"
                    draggable="true"
                    @mousedown.stop
                    @click.stop
                    @dragstart="startDrag(panel, $event)"
                    @dragend="endDrag()"
                  >
                    <div i-ph-dots-six-vertical-bold text-sm />
                    <span op80>Drag</span>
                  </div>

                  <PanelEditor v-if="panel === 'editor'" />

                  <template v-else-if="panel === 'output'">
                    <PanelPreview v-if="ui.showPreview && !ui.showConsole" />
                    <PanelConsole v-else-if="ui.showConsole && !ui.showPreview" />

                    <Splitter.Root
                      v-else-if="outputHasBothPanels"
                      :panels="outputPanels"
                      orientation="vertical"
                      :size="outputSizes"
                      relative h-full w-full of-hidden
                      @resize-start="onResizeStart"
                      @resize="onOutputResize"
                      @resize-end="onOutputResizeEnd"
                    >
                      <Splitter.Panel id="preview-panel">
                        <PanelPreview />
                      </Splitter.Panel>

                      <Splitter.ResizeTrigger :id="outputTriggerId" />

                      <Splitter.Panel id="console-panel">
                        <PanelConsole />
                      </Splitter.Panel>
                    </Splitter.Root>
                  </template>

                  <PanelTerminal v-else-if="panel === 'terminal' && terminalVisible" />
                </div>
              </Splitter.Panel>

              <Splitter.ResizeTrigger
                v-if="codeTriggerIds[index]"
                :id="codeTriggerIds[index]"
              />
            </template>
          </Splitter.Root>

          <!-- Drag reorder overlay -->
          <Transition name="layout-drag">
            <div
              v-if="isDragging"
              absolute inset-0 z-50
              flex gap-2 p-2
              class="bg-base/70 backdrop-blur-sm"
              :style="{ flexDirection: codeFlexDirection }"
            >
              <template v-for="(panel, index) in codeVisiblePanels" :key="panel">
                <!-- insertion gap before first panel -->
                <div
                  v-if="index === 0"
                  select-none rounded-sm transition-colors
                  :class="[
                    codeFlexDirection === 'column' ? 'h-1.5 w-full' : 'h-full w-1.5',
                    dropTarget === '__before_0' ? 'bg-primary/70' : 'bg-base/30',
                  ]"
                  @dragenter.prevent="dropTarget = '__before_0'"
                  @dragleave="dropTarget = null"
                  @dragover.prevent
                  @drop.prevent="onDropOnPanel(panel)"
                />

                <!-- panel slot -->
                <div
                  flex-1 border-2 rounded-lg transition-all
                  flex="~ items-center justify-center"
                  :class="[
                    panel === draggedPanel
                      ? 'op30 border-dashed border-base/50 bg-transparent'
                      : 'bg-faded/60',
                    dropTarget === `__before_${index}` || dropTarget === `__after_${index}`
                      ? 'border-primary bg-primary/10'
                      : 'border-transparent',
                  ]"
                  @dragenter.prevent="onPanelSlotDragOver(index, $event)"
                  @dragleave="dropTarget = null"
                  @dragover.prevent="onPanelSlotDragOver(index, $event)"
                  @drop.prevent="onDropOnPanelSlot(panel, index, $event)"
                >
                  <span text-sm op60>{{ panelLabels[panel] }}</span>
                </div>

                <!-- insertion gap after this panel -->
                <div
                  select-none rounded-sm transition-colors
                  :class="[
                    codeFlexDirection === 'column' ? 'h-1.5 w-full' : 'h-full w-1.5',
                    dropTarget === `__after_${index}` ? 'bg-primary/70' : 'bg-base/30',
                  ]"
                  @dragenter.prevent="dropTarget = `__after_${index}`"
                  @dragleave="dropTarget = null"
                  @dragover.prevent
                  @drop.prevent="onDropAfter(index)"
                />
              </template>
            </div>
          </Transition>
        </div>
      </div>
    </Splitter.Panel>
  </Splitter.Root>

  <Transition name="slide-fade">
    <Splitter.Root
      v-if="guide.embeddedDocs"
      :panels="embeddedPanels"
      :size="mainSizes"
      fixed inset-0 z-embedded-docs
      @resize-start="onResizeStart"
      @resize="onEmbeddedResize"
      @resize-end="onEmbeddedResizeEnd"
    >
      <Splitter.Panel
        id="embedded-docs-panel"
        relative
      >
        <iframe
          :class="{ 'pointer-events-none': ui.isPanelDragging }"
          :src="guide.embeddedDocs"
          crossorigin="anonymous" allow="cross-origin-isolated" credentialless
          inset-0 h-full w-full
        />
      </Splitter.Panel>

      <Splitter.ResizeTrigger id="embedded-docs-panel:embedded-spacer-panel" />

      <Splitter.Panel
        id="embedded-spacer-panel"
        relative important-of-visible
      >
        <div
          border="~ base"
          absolute left--4 top-4 z-embedded-docs-close h-8 w-8 of-hidden rounded-full bg-base
        >
          <button
            flex="~ items-center justify-center"
            h-full w-full hover:bg-active
            title="Close embedded docs"
            @click="guide.embeddedDocs = ''"
          >
            <div i-ph-caret-left-bold h-4 w-4 />
          </button>
        </div>
      </Splitter.Panel>
    </Splitter.Root>
  </Transition>
</template>

<style>
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(-30vw);
  opacity: 0;
}

.layout-drag-enter-active,
.layout-drag-leave-active {
  transition: opacity 0.15s ease;
}

.layout-drag-enter-from,
.layout-drag-leave-to {
  opacity: 0;
}
</style>
