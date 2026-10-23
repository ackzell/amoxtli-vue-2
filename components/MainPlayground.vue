<script setup lang="ts">
import type { DropZone, LayoutSplit } from '@calmecac-vue/playground-layout'
import type { CodePanelId } from '~/stores/ui'
import { Splitter } from '@ark-ui/vue'
import {
  cleanupTree,
  collectMaxSplitNumber,
  ensureAllPanelsExist,
  ensureRootSplit,
  filterVisible,
  hasPanel,
  insertAtTarget,
  pruneSizesMap,
  removePanel,
} from '@calmecac-vue/playground-layout'
import { CODE_PANEL_IDS } from '~/stores/ui'

const ui = useUiState()
const { width: windowWidth } = useWindowSize()
const isMobile = computed(() => windowWidth.value < 768)

// When expanding back to desktop, restore split view unless the user explicitly
// chose a focused mode via the desktop nav (tracked by mainViewModeFromDesktop).
watch(isMobile, (nowMobile, wasMobile) => {
  if (!wasMobile && nowMobile) {
    // wide → narrow: if in split mode, default the mobile toggle to docs
    if (ui.mainViewMode === 'split')
      ui.setMainViewMode('docs')
  }
  if (wasMobile && !nowMobile) {
    if (!ui.mainViewModeFromDesktop)
      ui.setMainViewMode('split')
  }
  if (!nowMobile)
    ui.mainViewModeFromDesktop = false
})
const guide = useGuideStore()
const route = useRoute()

const effectiveMainViewMode = computed(() => {
  if (guide.currentGuide?.features?.defaultLayout === 'docs')
    return 'docs'
  return ui.mainViewMode
})
const isSplitMode = computed(() => effectiveMainViewMode.value === 'split')
const isCodeOnlyMode = computed(() => effectiveMainViewMode.value === 'code')
const isDocsOnlyMode = computed(() => effectiveMainViewMode.value === 'docs')

// Mobile panel slide styles — both panels always mounted, toggled via CSS transform
const codePaneStyle = computed(() => {
  const active = isCodeOnlyMode.value
  return {
    // transform: active ? 'translateX(0)' : 'translateX(100%)',
    zIndex: active ? 1 : 0,
    visibility: (active ? 'visible' : 'hidden') as 'visible' | 'hidden',
    // transition: active
    //   ? 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), visibility 0s'
    //   : 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), visibility 0s 0.28s',
  }
})

const docsPaneStyle = computed(() => {
  const active = !isCodeOnlyMode.value
  return {
    // transform: active ? 'translateX(0)' : 'translateX(-100%)',
    zIndex: active ? 1 : 0,
    visibility: (active ? 'visible' : 'hidden') as 'visible' | 'hidden',
    // transition: active
    //   ? 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), visibility 0s'
    //   : 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), visibility 0s 0.28s',
  }
})

// When reversed, code panel comes first physically; panels array order must match template order.
const isReversed = computed(() => ui.mainLayoutReverse)

const mainPanels = computed(() => {
  const docs = { id: 'docs-panel', minSize: 0, maxSize: 100, collapsible: true, collapsedSize: 0 }
  const code = { id: 'code-panel', minSize: 0, maxSize: 100, collapsible: true, collapsedSize: 0 }
  return isReversed.value ? [code, docs] : [docs, code]
})

const embeddedPanels = computed(() => {
  const docsPart = { id: 'embedded-docs-panel', minSize: 0, maxSize: 100, collapsible: true, collapsedSize: 0 }
  const spacer = { id: 'embedded-spacer-panel', minSize: 0, maxSize: 100, collapsible: true, collapsedSize: 0 }
  return isReversed.value ? [spacer, docsPart] : [docsPart, spacer]
})

// mainSizes index 0 always corresponds to the first panel in mainPanels.
// When not reversed: [0] = docs size, [1] = code size.
// When reversed:     [0] = code size, [1] = docs size.
const mainSizes = computed<number[]>({
  get() {
    const docsSize = isCodeOnlyMode.value ? 0 : isDocsOnlyMode.value ? 100 : ui.panelDocs
    const codeSize = Math.max(0, 100 - docsSize)
    return isReversed.value ? [codeSize, docsSize] : [docsSize, codeSize]
  },
  set(value) {
    if (!isSplitMode.value)
      return
    // value[0] is always the first physical panel.
    ui.panelDocs = isReversed.value ? (value[1] ?? 0) : (value[0] ?? 0)
  },
})

const draggedPanelId = ref<CodePanelId | null>(null)
const activeDropZone = ref<string | null>(null)
const codeSizesMap = ref<Record<string, number[]>>({})

// Dynamic imports for playground components to prevent initialization when not needed
const PanelCodeToolbar = defineAsyncComponent(() =>
  import('~/components/PanelCodeToolbar.vue'),
)
const PlaygroundCodeDock = defineAsyncComponent(() =>
  import('~/components/PlaygroundCodeDock.vue'),
)

const REQUIRED_PANELS = CODE_PANEL_IDS

const splitIdCounter = ref(Math.max(4, collectMaxSplitNumber(ui.layoutTree) + 1))

function nextSplitId() {
  const id = `split-${splitIdCounter.value}`
  splitIdCounter.value += 1
  return id
}

function onDragStart(panelId: CodePanelId) {
  draggedPanelId.value = panelId
}

function onDragEnd() {
  draggedPanelId.value = null
  activeDropZone.value = null
}

function onDropZoneEnter(zoneId: string) {
  if (!draggedPanelId.value)
    return
  activeDropZone.value = zoneId
}

function onDropZoneLeave() {
  activeDropZone.value = null
}

function onCodeSplitResize(splitId: string, sizes: number[]) {
  codeSizesMap.value = {
    ...codeSizesMap.value,
    [splitId]: [...sizes],
  }
}

const visiblePanelIds = computed(() => {
  const ids = new Set<CodePanelId>(['editor'])
  if (ui.showPreview)
    ids.add('preview')
  if (ui.showConsole)
    ids.add('console')
  if (ui.showTerminal)
    ids.add('terminal')
  return ids
})

const visibleLayout = computed<LayoutSplit<CodePanelId>>(() => {
  const filtered = filterVisible(ui.layoutTree, visiblePanelIds.value)
  if (!filtered) {
    return {
      type: 'split',
      id: 'split-visible-fallback',
      direction: 'vertical',
      children: [{ type: 'panel', id: 'editor' }],
    }
  }

  const cleaned = cleanupTree(filtered)
  if (cleaned.type === 'split')
    return cleaned

  return {
    type: 'split',
    id: 'split-visible-wrapper',
    direction: 'vertical',
    children: [cleaned],
  }
})

watch(
  () => ui.layoutTree,
  (current) => {
    const next = ensureAllPanelsExist(current, REQUIRED_PANELS, nextSplitId)
    if (next !== current)
      ui.layoutTree = next
  },
  { deep: true, immediate: true },
)

watch(
  () => ui.layoutTree,
  (next) => {
    splitIdCounter.value = Math.max(splitIdCounter.value, collectMaxSplitNumber(next) + 1)
  },
  { deep: true },
)

function onZoneDrop(draggedId: CodePanelId, targetId: string, zone: DropZone) {
  const previousLayout = ui.layoutTree
  const removal = removePanel(previousLayout, draggedId)

  if (!removal.removed || !removal.node) {
    onDragEnd()
    return
  }

  const inserted = insertAtTarget(removal.node, targetId, removal.removed, zone, nextSplitId)
  if (!hasPanel(inserted, draggedId)) {
    ui.layoutTree = previousLayout
    onDragEnd()
    return
  }

  const cleaned = ensureRootSplit(cleanupTree(inserted), nextSplitId)
  if (!hasPanel(cleaned, draggedId)) {
    ui.layoutTree = previousLayout
    onDragEnd()
    return
  }

  ui.layoutTree = cleaned
  codeSizesMap.value = pruneSizesMap(cleaned, codeSizesMap.value)
  onDragEnd()
}

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

function onEmbeddedResize(details: { size: number[] }) {
  mainSizes.value = details.size
}

function onEmbeddedResizeEnd(details: { size: number[] }) {
  mainSizes.value = details.size
  ui.isPanelDragging = false
}
</script>

<template>
  <!-- Mobile: both panels always mounted, toggled via CSS transform/visibility -->
  <template v-if="isMobile">
    <div h-full relative of-hidden>
      <!-- Code dock stays mounted so the preview iframe keeps running and
           challenge DOM validation can inspect it from the docs view. -->
      <div
        id="amx-code-pane"
        key="code-pane"
        grid="~ rows-[max-content_1fr]"
        h-full inset-0 absolute
        tabindex="-1"
        role="region"
        :aria-label="$t('code')"
        :style="codePaneStyle"
      >
        <PanelCodeToolbar />
        <div min-h-0 relative of-hidden>
          <PlaygroundCodeDock
            :node="visibleLayout"
            :dragged-panel-id="draggedPanelId"
            :active-drop-zone="activeDropZone"
            :sizes-map="codeSizesMap"
            @drag-start="onDragStart"
            @drag-end="onDragEnd"
            @drop-zone-enter="onDropZoneEnter"
            @drop-zone-leave="onDropZoneLeave"
            @zone-drop="onZoneDrop"
            @split-resize="onCodeSplitResize"
          />
        </div>
      </div>

      <!-- Docs panel slides over or under the code dock -->
      <div
        key="docs-pane"
        h-full inset-0 absolute
        :style="docsPaneStyle"
      >
        <PanelDocs :key="route.path" />
      </div>
    </div>
  </template>

  <!-- Desktop: split panel view -->
  <template v-else>
    <!-- Normal order: docs | resize | code -->
    <Splitter.Root
      v-if="!isReversed"
      :key="`${effectiveMainViewMode}-normal`"
      :panels="mainPanels"
      :orientation="ui.mainLayoutOrientation"
      :size="mainSizes"
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
          <div
            min-h-0 relative of-hidden
            :class="guide.embeddedDocs ? 'z-embedded-docs-raised' : ''"
          >
            <PlaygroundCodeDock
              :node="visibleLayout"
              :dragged-panel-id="draggedPanelId"
              :active-drop-zone="activeDropZone"
              :sizes-map="codeSizesMap"
              @drag-start="onDragStart"
              @drag-end="onDragEnd"
              @drop-zone-enter="onDropZoneEnter"
              @drop-zone-leave="onDropZoneLeave"
              @zone-drop="onZoneDrop"
              @split-resize="onCodeSplitResize"
            />
          </div>
        </div>
      </Splitter.Panel>
    </Splitter.Root>

    <!-- Reversed order: code | resize | docs -->
    <Splitter.Root
      v-else
      :key="`${effectiveMainViewMode}-reversed`"
      :panels="mainPanels"
      :orientation="ui.mainLayoutOrientation"
      :size="mainSizes"
      h-full of-hidden
      @resize-start="onResizeStart"
      @resize="onMainResize"
      @resize-end="onMainResizeEnd"
    >
      <Splitter.Panel id="code-panel">
        <div v-if="!isDocsOnlyMode" h-full grid="~ rows-[max-content_1fr]">
          <PanelCodeToolbar />
          <div
            min-h-0 relative of-hidden
            :class="guide.embeddedDocs ? 'z-embedded-docs-raised' : ''"
          >
            <PlaygroundCodeDock
              :node="visibleLayout"
              :dragged-panel-id="draggedPanelId"
              :active-drop-zone="activeDropZone"
              :sizes-map="codeSizesMap"
              @drag-start="onDragStart"
              @drag-end="onDragEnd"
              @drop-zone-enter="onDropZoneEnter"
              @drop-zone-leave="onDropZoneLeave"
              @zone-drop="onZoneDrop"
              @split-resize="onCodeSplitResize"
            />
          </div>
        </div>
      </Splitter.Panel>

      <Splitter.ResizeTrigger v-if="isSplitMode" id="code-panel:docs-panel" />

      <Splitter.Panel id="docs-panel">
        <PanelDocs v-if="!isCodeOnlyMode" :key="route.path" />
      </Splitter.Panel>
    </Splitter.Root>

    <Transition name="slide-fade">
      <!-- Normal embedded docs order: docs iframe | resize | spacer -->
      <Splitter.Root
        v-if="guide.embeddedDocs && !isReversed"
        :panels="embeddedPanels"
        :size="mainSizes"
        inset-0 fixed z-embedded-docs
        @resize-start="onResizeStart"
        @resize="onEmbeddedResize"
        @resize-end="onEmbeddedResizeEnd"
      >
        <Splitter.Panel id="embedded-docs-panel" relative>
          <iframe
            :class="{ 'pointer-events-none': ui.isPanelDragging }"
            :src="guide.embeddedDocs"
            crossorigin="anonymous" allow="cross-origin-isolated"
            credentialless h-full w-full inset-0
          />
        </Splitter.Panel>

        <Splitter.ResizeTrigger id="embedded-docs-panel:embedded-spacer-panel" />

        <Splitter.Panel id="embedded-spacer-panel" relative important-of-visible>
          <div
            border="~ base"
            rounded-full bg-base h-8 w-8 left--4 top-4 absolute z-embedded-docs-close of-hidden
          >
            <IconButton
              tooltip="Close embedded docs"
              tooltip-placement="left"
              padding="sm"
              class="flex h-full w-full items-center justify-center"
              @click="guide.embeddedDocs = ''"
            >
              <div i-ph-caret-left-bold h-4 w-4 />
            </IconButton>
          </div>
        </Splitter.Panel>
      </Splitter.Root>

      <!-- Reversed embedded docs order: spacer | resize | docs iframe -->
      <Splitter.Root
        v-else-if="guide.embeddedDocs && isReversed"
        :panels="embeddedPanels"
        :size="mainSizes"
        inset-0 fixed z-embedded-docs
        @resize-start="onResizeStart"
        @resize="onEmbeddedResize"
        @resize-end="onEmbeddedResizeEnd"
      >
        <Splitter.Panel id="embedded-spacer-panel" relative important-of-visible>
          <div
            border="~ base"
            rounded-full bg-base h-8 w-8 right--4 top-4 absolute z-embedded-docs-close of-hidden
          >
            <IconButton
              tooltip="Close embedded docs"
              tooltip-placement="right"
              padding="sm"
              class="flex h-full w-full items-center justify-center"
              @click="guide.embeddedDocs = ''"
            >
              <div i-ph-caret-right-bold h-4 w-4 />
            </IconButton>
          </div>
        </Splitter.Panel>

        <Splitter.ResizeTrigger id="embedded-spacer-panel:embedded-docs-panel" />

        <Splitter.Panel id="embedded-docs-panel" relative>
          <iframe
            :class="{ 'pointer-events-none': ui.isPanelDragging }"
            :src="guide.embeddedDocs"
            crossorigin="anonymous" allow="cross-origin-isolated"
            credentialless h-full w-full inset-0
          />
        </Splitter.Panel>
      </Splitter.Root>
    </Transition>
  </template>
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
</style>
