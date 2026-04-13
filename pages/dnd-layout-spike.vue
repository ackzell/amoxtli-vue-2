<script setup lang="ts">
import type { DropZone, SpikeLayoutNode, SpikePanelId, SpikePanelNode } from '~/types/dnd-spike'
import LayoutDockNode from '~/components/spike/LayoutDockNode.vue'

const INITIAL_PANELS: SpikePanelId[] = ['editor', 'preview', 'console', 'terminal']

let splitIdCounter = 0

function nextSplitId() {
  splitIdCounter += 1
  return `split-${splitIdCounter}`
}

function createInitialLayout(): SpikeLayoutNode {
  return {
    type: 'split',
    id: 'split-root',
    direction: 'horizontal',
    children: INITIAL_PANELS.map(id => ({ type: 'panel', id })),
  }
}

const layout = ref<SpikeLayoutNode>(createInitialLayout())
const draggedPanel = ref<SpikePanelId | null>(null)
const hoverKey = ref<string | null>(null)
const sizesMap = ref<Record<string, number[]>>({})

function onSplitResize(splitId: string, sizes: number[]) {
  if (!sizes.length)
    return

  sizesMap.value = { ...sizesMap.value, [splitId]: [...sizes] }
}

function collectSplitIds(node: SpikeLayoutNode, ids = new Set<string>()) {
  if (node.type === 'panel')
    return ids

  ids.add(node.id)
  for (const child of node.children)
    collectSplitIds(child, ids)
  return ids
}

function pruneSizesMap(layoutNode: SpikeLayoutNode) {
  const splitIds = collectSplitIds(layoutNode)
  const next: Record<string, number[]> = {}

  for (const [splitId, sizes] of Object.entries(sizesMap.value)) {
    if (splitIds.has(splitId))
      next[splitId] = sizes
  }

  sizesMap.value = next
}

function cloneNode<T>(node: T): T {
  return JSON.parse(JSON.stringify(node)) as T
}

// Removes empty/null children but does NOT collapse single-child splits,
// keeping the tree structure stable so split IDs survive removePanel.
function filterEmpty(node: SpikeLayoutNode | null): SpikeLayoutNode | null {
  if (!node)
    return null

  if (node.type === 'panel')
    return node

  const children = node.children
    .map(child => filterEmpty(child))
    .filter(Boolean) as SpikeLayoutNode[]

  if (children.length === 0)
    return null

  return { ...node, children }
}

function cleanupTree(node: SpikeLayoutNode | null): SpikeLayoutNode | null {
  if (!node)
    return null

  if (node.type === 'panel')
    return node

  const children = node.children
    .map(child => cleanupTree(child))
    .filter(Boolean) as SpikeLayoutNode[]

  if (children.length === 0)
    return null

  if (children.length === 1)
    return children[0] ?? null

  // Flatten nested splits with the same direction
  const flatChildren: SpikeLayoutNode[] = []
  for (const child of children) {
    if (child.type === 'split' && child.direction === node.direction) {
      flatChildren.push(...child.children)
    }
    else {
      flatChildren.push(child)
    }
  }

  return {
    ...node,
    children: flatChildren,
  }
}

function removePanel(node: SpikeLayoutNode, panelId: SpikePanelId): {
  node: SpikeLayoutNode | null
  removed: SpikePanelNode | null
} {
  if (node.type === 'panel') {
    if (node.id === panelId)
      return { node: null, removed: node }
    return { node, removed: null }
  }

  const nextChildren: SpikeLayoutNode[] = []
  let removed: SpikePanelNode | null = null

  for (const child of node.children) {
    if (removed) {
      nextChildren.push(child)
      continue
    }

    const result = removePanel(child, panelId)
    removed = result.removed

    if (result.node)
      nextChildren.push(result.node)
  }

  // Use filterEmpty (not cleanupTree) to preserve the split structure
  // so paths remain stable for the subsequent insertAtTarget call
  return {
    node: filterEmpty({ ...node, children: nextChildren }),
    removed,
  }
}

function splitForZone(target: SpikeLayoutNode, dragged: SpikePanelNode, zone: DropZone): SpikeLayoutNode {
  if (zone === 'left') {
    return {
      type: 'split',
      id: nextSplitId(),
      direction: 'horizontal',
      children: [dragged, target],
    }
  }

  if (zone === 'right') {
    return {
      type: 'split',
      id: nextSplitId(),
      direction: 'horizontal',
      children: [target, dragged],
    }
  }

  if (zone === 'top') {
    return {
      type: 'split',
      id: nextSplitId(),
      direction: 'vertical',
      children: [dragged, target],
    }
  }

  return {
    type: 'split',
    id: nextSplitId(),
    direction: 'vertical',
    children: [target, dragged],
  }
}

function insertAtTarget(node: SpikeLayoutNode, targetId: string, dragged: SpikePanelNode, zone: DropZone): {
  node: SpikeLayoutNode
  inserted: boolean
} {
  // Match by id — works for both panel nodes (SpikePanelId) and split nodes (generated id)
  if (node.id === targetId) {
    return {
      node: splitForZone(node, dragged, zone),
      inserted: true,
    }
  }

  if (node.type === 'panel') {
    return { node, inserted: false }
  }

  const nextChildren: SpikeLayoutNode[] = []
  let inserted = false

  for (const child of node.children) {
    if (inserted) {
      nextChildren.push(child)
      continue
    }

    const result = insertAtTarget(child, targetId, dragged, zone)
    nextChildren.push(result.node)
    inserted = result.inserted
  }

  return {
    node: {
      ...node,
      children: nextChildren,
    },
    inserted,
  }
}

function onDragStart(panelId: SpikePanelId, event: DragEvent) {
  draggedPanel.value = panelId
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', panelId)
  }
}

function onDragEnd() {
  draggedPanel.value = null
  hoverKey.value = null
}

function onZoneEnter(target: string, zone: DropZone) {
  hoverKey.value = `${target}:${zone}`
}

function onZoneLeave() {
  hoverKey.value = null
}

function onZoneDrop(target: string, zone: DropZone) {
  if (!draggedPanel.value || draggedPanel.value === target) {
    onDragEnd()
    return
  }

  const current = cloneNode(layout.value)
  const { node: withoutDragged, removed } = removePanel(current, draggedPanel.value)

  if (!withoutDragged || !removed) {
    onDragEnd()
    return
  }

  const inserted = insertAtTarget(withoutDragged, target, removed, zone)
  const nextLayout = cleanupTree(inserted.node) || createInitialLayout()
  layout.value = nextLayout
  pruneSizesMap(nextLayout)
  onDragEnd()
}

function resetLayout() {
  splitIdCounter = 0
  layout.value = createInitialLayout()
  sizesMap.value = {}
  onDragEnd()
}
</script>

<template>
  <!-- eslint-disable @intlify/vue-i18n/no-raw-text -->
  <main class="h-screen w-screen overflow-hidden bg-base p4" grid="~ rows-[min-content_1fr] gap-3">
    <div flex="~ items-center gap-2 wrap">
      <strong>Docking DnD Spike</strong>
      <button rounded border="~ base" px3 py1 text-sm hover:bg-active @click="resetLayout()">
        Reset
      </button>
      <span text-sm op70>Drag a panel and drop on left/right/top/bottom of another panel.</span>
    </div>

    <div class="h-full min-h-0">
      <LayoutDockNode
        :node="layout"
        :dragged-panel="draggedPanel"
        :hover-key="hoverKey"
        :sizes-map="sizesMap"
        @drag-start="onDragStart"
        @drag-end="onDragEnd"
        @zone-enter="onZoneEnter"
        @zone-leave="onZoneLeave"
        @zone-drop="onZoneDrop"
        @split-resize="onSplitResize"
      />
    </div>
  </main>
  <!-- eslint-enable @intlify/vue-i18n/no-raw-text -->
</template>
