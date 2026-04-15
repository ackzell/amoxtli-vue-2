<script setup lang="ts">
import type { DropZone } from '~/types/dnd-spike'
import type { CodePanelId, LayoutNode, LayoutSplit } from '~/types/layout'
import { Splitter } from '@ark-ui/vue'
import PlaygroundCodeDockNode from '~/components/PlaygroundCodeDockNode.vue'

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

const mainPanels = [
  { id: 'docs-panel', minSize: 0, maxSize: 100, collapsible: true, collapsedSize: 0 },
  { id: 'code-panel', minSize: 0, maxSize: 100, collapsible: true, collapsedSize: 0 },
]

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

const draggedPanelId = ref<CodePanelId | null>(null)
const activeDropZone = ref<string | null>(null)
const codeSizesMap = ref<Record<string, number[]>>({})

function collectMaxSplitNumber(node: LayoutNode): number {
  if (node.type === 'panel')
    return 0

  const current = Number.parseInt(node.id.replace('split-', ''), 10)
  const childMax = node.children.reduce((max, child) => Math.max(max, collectMaxSplitNumber(child)), 0)
  return Math.max(Number.isNaN(current) ? 0 : current, childMax)
}

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

function isAxisAlignedDrop(direction: LayoutSplit['direction'], zone: DropZone) {
  return (direction === 'horizontal' && (zone === 'left' || zone === 'right'))
    || (direction === 'vertical' && (zone === 'top' || zone === 'bottom'))
}

function splitForZone(target: LayoutNode, dragged: { type: 'panel', id: CodePanelId }, zone: DropZone): LayoutSplit {
  const direction = zone === 'left' || zone === 'right' ? 'horizontal' : 'vertical'
  const before = zone === 'left' || zone === 'top'
  return {
    type: 'split',
    id: nextSplitId(),
    direction,
    children: before ? [dragged, target] : [target, dragged],
  }
}

function removePanel(node: LayoutNode, panelId: CodePanelId): { node: LayoutNode | null, removed: { type: 'panel', id: CodePanelId } | null } {
  if (node.type === 'panel') {
    if (node.id === panelId)
      return { node: null, removed: node }
    return { node, removed: null }
  }

  let removed: { type: 'panel', id: CodePanelId } | null = null
  const children: LayoutNode[] = []

  for (const child of node.children) {
    const result = removePanel(child, panelId)
    if (result.removed)
      removed = result.removed
    if (result.node)
      children.push(result.node)
  }

  if (children.length === 0)
    return { node: null, removed }
  if (children.length === 1)
    return { node: { ...node, children }, removed }

  return {
    node: {
      ...node,
      children,
    },
    removed,
  }
}

function insertAtTarget(node: LayoutNode, targetId: string, dragged: { type: 'panel', id: CodePanelId }, zone: DropZone): LayoutNode {
  if (node.type === 'panel') {
    if (node.id !== targetId)
      return node
    return splitForZone(node, dragged, zone)
  }

  if (node.id === targetId) {
    if (isAxisAlignedDrop(node.direction, zone)) {
      const insertAtStart = zone === 'left' || zone === 'top'
      return {
        ...node,
        children: insertAtStart
          ? [dragged, ...node.children]
          : [...node.children, dragged],
      }
    }

    return splitForZone(node, dragged, zone)
  }

  return {
    ...node,
    children: node.children.map(child => insertAtTarget(child, targetId, dragged, zone)),
  }
}

function cleanupTree(node: LayoutNode): LayoutNode {
  if (node.type === 'panel')
    return node

  const cleanedChildren = node.children.map(cleanupTree)

  if (cleanedChildren.length === 1)
    return cleanedChildren[0]!

  const flattenedChildren: LayoutNode[] = []
  for (const child of cleanedChildren) {
    if (child.type === 'split' && child.direction === node.direction)
      flattenedChildren.push(...child.children)
    else
      flattenedChildren.push(child)
  }

  if (flattenedChildren.length === 1)
    return flattenedChildren[0]!

  return {
    ...node,
    children: flattenedChildren,
  }
}

function hasPanel(node: LayoutNode, panelId: CodePanelId): boolean {
  if (node.type === 'panel')
    return node.id === panelId

  return node.children.some(child => hasPanel(child, panelId))
}

function collectSplitIds(node: LayoutNode, ids = new Set<string>()) {
  if (node.type === 'split') {
    ids.add(node.id)
    for (const child of node.children)
      collectSplitIds(child, ids)
  }
  return ids
}

function pruneSizesMap(node: LayoutNode) {
  const existingSplitIds = collectSplitIds(node)
  const next: Record<string, number[]> = {}

  for (const [key, value] of Object.entries(codeSizesMap.value)) {
    if (existingSplitIds.has(key) && Array.isArray(value))
      next[key] = value
  }

  codeSizesMap.value = next
}

function ensureRootSplit(node: LayoutNode): LayoutSplit {
  if (node.type === 'split')
    return node

  return {
    type: 'split',
    id: nextSplitId(),
    direction: 'vertical',
    children: [node],
  }
}

function filterVisible(node: LayoutNode, visibleIds: Set<CodePanelId>): LayoutNode | null {
  if (node.type === 'panel')
    return visibleIds.has(node.id) ? node : null

  const children = node.children
    .map(child => filterVisible(child, visibleIds))
    .filter((child): child is LayoutNode => child !== null)

  if (children.length === 0)
    return null

  return {
    ...node,
    children,
  }
}

function collectPanels(node: LayoutNode, out = new Set<CodePanelId>()) {
  if (node.type === 'panel') {
    out.add(node.id)
    return out
  }

  for (const child of node.children)
    collectPanels(child, out)

  return out
}

function syncLayoutForVisibility() {
  const visibleIds = new Set<CodePanelId>(['editor'])
  if (ui.showPreview)
    visibleIds.add('preview')
  if (ui.showConsole)
    visibleIds.add('console')
  if (ui.showTerminal)
    visibleIds.add('terminal')

  const filtered = filterVisible(ui.layoutTree, visibleIds)
  let root = ensureRootSplit(filtered ?? {
    type: 'split',
    id: nextSplitId(),
    direction: 'vertical',
    children: [],
  })

  const existing = collectPanels(root)
  for (const id of visibleIds) {
    if (!existing.has(id))
      root.children.push({ type: 'panel', id })
  }

  root = ensureRootSplit(cleanupTree(root))
  ui.layoutTree = root
  pruneSizesMap(root)
}

watch(
  () => [ui.showPreview, ui.showConsole, ui.showTerminal],
  () => {
    syncLayoutForVisibility()
  },
  { immediate: true },
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
  const removal = removePanel(ui.layoutTree, draggedId)

  if (!removal.removed || !removal.node) {
    onDragEnd()
    return
  }

  const inserted = insertAtTarget(removal.node, targetId, removal.removed, zone)
  if (!hasPanel(inserted, draggedId)) {
    ui.layoutTree = previousLayout
    onDragEnd()
    return
  }

  const cleaned = ensureRootSplit(cleanupTree(inserted))
  if (!hasPanel(cleaned, draggedId)) {
    ui.layoutTree = previousLayout
    onDragEnd()
    return
  }

  ui.layoutTree = cleaned
  pruneSizesMap(cleaned)
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
        <div
          relative min-h-0 of-hidden
          :class="guide.embeddedDocs ? 'z-embedded-docs-raised' : ''"
        >
          <PlaygroundCodeDockNode
            :node="ui.layoutTree"
            :dragged-panel-id="draggedPanelId"
            :active-drop-zone="activeDropZone"
            :sizes-map="codeSizesMap"
            :show-preview="ui.showPreview"
            :show-console="ui.showConsole"
            :show-terminal="ui.showTerminal"
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
</style>
