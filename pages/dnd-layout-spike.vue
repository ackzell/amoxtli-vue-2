<script setup lang="ts">
import type { DropZone, SpikeLayoutNode, SpikePanelId, SpikePanelNode, SpikeSplitNode } from '~/types/dnd-spike'
import LayoutDockNode from '~/components/spike/LayoutDockNode.vue'

const splitIdCounter = ref(3)

const layout = ref<SpikeLayoutNode>({
  type: 'split',
  id: 'split-1',
  direction: 'horizontal',
  children: [
    { type: 'panel', id: 'editor' },
    {
      type: 'split',
      id: 'split-2',
      direction: 'vertical',
      children: [
        { type: 'panel', id: 'preview' },
        {
          type: 'split',
          id: 'split-3',
          direction: 'horizontal',
          children: [
            { type: 'panel', id: 'console' },
            { type: 'panel', id: 'terminal' },
          ],
        },
      ],
    },
  ],
})

const draggedPanelId = ref<SpikePanelId | null>(null)
const activeDropZone = ref<string | null>(null)
const sizesMap = ref<Record<string, number[]>>({})

function nextSplitId() {
  splitIdCounter.value += 1
  return `split-${splitIdCounter.value}`
}

function onDragStart(panelId: SpikePanelId) {
  console.warn('[Page] onDragStart', panelId)
  draggedPanelId.value = panelId
}

function onDragEnd() {
  console.warn('[Page] onDragEnd')
  draggedPanelId.value = null
  activeDropZone.value = null
}

function onDropZoneEnter(zoneId: string) {
  if (!draggedPanelId.value)
    return
  console.warn('[Page] zoneEnter', zoneId)
  activeDropZone.value = zoneId
}

function onDropZoneLeave() {
  activeDropZone.value = null
}

function onSplitResize(splitId: string, sizes: number[]) {
  sizesMap.value = {
    ...sizesMap.value,
    [splitId]: [...sizes],
  }
}

function isAxisAlignedDrop(direction: SpikeSplitNode['direction'], zone: DropZone) {
  return (direction === 'horizontal' && (zone === 'left' || zone === 'right'))
    || (direction === 'vertical' && (zone === 'top' || zone === 'bottom'))
}

function splitForZone(target: SpikeLayoutNode, dragged: SpikePanelNode, zone: DropZone): SpikeSplitNode {
  const direction = zone === 'left' || zone === 'right' ? 'horizontal' : 'vertical'
  const before = zone === 'left' || zone === 'top'
  return {
    type: 'split',
    id: nextSplitId(),
    direction,
    children: before ? [dragged, target] : [target, dragged],
  }
}

function removePanel(node: SpikeLayoutNode, panelId: SpikePanelId): { node: SpikeLayoutNode | null, removed: SpikePanelNode | null } {
  if (node.type === 'panel') {
    if (node.id === panelId)
      return { node: null, removed: node }
    return { node, removed: null }
  }

  let removed: SpikePanelNode | null = null
  const children: SpikeLayoutNode[] = []

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

function insertAtTarget(
  node: SpikeLayoutNode,
  targetId: string,
  dragged: SpikePanelNode,
  zone: DropZone,
): SpikeLayoutNode {
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

function cleanupTree(node: SpikeLayoutNode): SpikeLayoutNode {
  if (node.type === 'panel')
    return node

  const cleanedChildren = node.children.map(cleanupTree)

  if (cleanedChildren.length === 1)
    return cleanedChildren[0]!

  const flattenedChildren: SpikeLayoutNode[] = []
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

function hasPanel(node: SpikeLayoutNode, panelId: SpikePanelId): boolean {
  if (node.type === 'panel')
    return node.id === panelId

  return node.children.some(child => hasPanel(child, panelId))
}

function collectSplitIds(node: SpikeLayoutNode, ids = new Set<string>()) {
  if (node.type === 'split') {
    ids.add(node.id)
    for (const child of node.children)
      collectSplitIds(child, ids)
  }
  return ids
}

function pruneSizesMap(node: SpikeLayoutNode) {
  const existingSplitIds = collectSplitIds(node)
  const next: Record<string, number[]> = {}

  for (const [key, value] of Object.entries(sizesMap.value)) {
    if (existingSplitIds.has(key))
      next[key] = value
  }

  sizesMap.value = next
}

function onZoneDrop(draggedId: SpikePanelId, targetId: string, zone: DropZone) {
  const previousLayout = layout.value
  const removal = removePanel(layout.value, draggedId)

  if (!removal.removed || !removal.node) {
    onDragEnd()
    return
  }

  const inserted = insertAtTarget(removal.node, targetId, removal.removed, zone)
  if (!hasPanel(inserted, draggedId)) {
    layout.value = previousLayout
    onDragEnd()
    return
  }

  const cleaned = cleanupTree(inserted)
  if (!hasPanel(cleaned, draggedId)) {
    layout.value = previousLayout
    onDragEnd()
    return
  }

  layout.value = cleaned
  pruneSizesMap(cleaned)
  onDragEnd()
}

function resetLayout() {
  splitIdCounter.value = 3
  layout.value = {
    type: 'split',
    id: 'split-1',
    direction: 'horizontal',
    children: [
      { type: 'panel', id: 'editor' },
      {
        type: 'split',
        id: 'split-2',
        direction: 'vertical',
        children: [
          { type: 'panel', id: 'preview' },
          {
            type: 'split',
            id: 'split-3',
            direction: 'horizontal',
            children: [
              { type: 'panel', id: 'console' },
              { type: 'panel', id: 'terminal' },
            ],
          },
        ],
      },
    ],
  }
  sizesMap.value = {}
  onDragEnd()
}
</script>

<template>
  <!-- eslint-disable @intlify/vue-i18n/no-raw-text, unocss/order, unocss/order-attributify -->
  <main class="h-screen w-screen overflow-hidden bg-base p4">
    <div class="mx-auto h-full w-full max-w-[1400px] flex flex-col gap-3">
      <header class="flex items-center gap-2 border border-base rounded bg-foreground/40 p2">
        <strong class="text-sm">DnD Layout Spike</strong>
        <button
          class="border border-base rounded px3 py1 text-xs hover:bg-active"
          @click="resetLayout"
        >
          Reset
        </button>
        <div class="ml-auto text-xs op70">
          drag panel headers, then drop on edge zones
        </div>
      </header>

      <section class="min-h-0 flex-1 border border-base rounded bg-foreground/20 p2">
        <LayoutDockNode
          :node="layout"
          :dragged-panel-id="draggedPanelId"
          :active-drop-zone="activeDropZone"
          :sizes-map="sizesMap"
          @drag-start="onDragStart"
          @drag-end="onDragEnd"
          @drop-zone-enter="onDropZoneEnter"
          @drop-zone-leave="onDropZoneLeave"
          @zone-drop="onZoneDrop"
          @split-resize="onSplitResize"
        />
      </section>
    </div>
  </main>
  <!-- eslint-enable @intlify/vue-i18n/no-raw-text, unocss/order, unocss/order-attributify -->
</template>
