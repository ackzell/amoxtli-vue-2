<script setup lang="ts">
import { Splitter } from '@ark-ui/vue'
import type { DropZone, SpikeLayoutNode, SpikePanelId } from '~/types/dnd-spike'

defineOptions({
  name: 'LayoutDockNode',
})

const props = defineProps<{
  node: SpikeLayoutNode
  draggedPanel: SpikePanelId | null
  hoverKey: string | null
  path?: string
  sizesMap?: Record<string, number[]>
}>()

const emit = defineEmits<{
  (e: 'drag-start', id: SpikePanelId, event: DragEvent): void
  (e: 'drag-end'): void
  (e: 'zone-enter', target: string, zone: DropZone): void
  (e: 'zone-leave'): void
  (e: 'zone-drop', target: string, zone: DropZone, event: DragEvent): void
  (e: 'split-resize', splitId: string, sizes: number[]): void
}>()

const panelLabels: Record<SpikePanelId, string> = {
  editor: 'Editor',
  preview: 'Preview',
  console: 'Console',
  terminal: 'Terminal',
}

const ZONES: DropZone[] = ['top', 'bottom', 'left', 'right']

const TITLE_BAR_BLOCK_PX = 36
const TITLE_BAR_INLINE_PX = 96
const SPLITTER_GUTTER_PX = 12

const splitWrapper = ref<HTMLElement | null>(null)
const splitExtent = ref(0)
let splitResizeObserver: ResizeObserver | null = null

function zoneKey(target: string, zone: DropZone) {
  return `${target}:${zone}`
}

function panelId(path: string, index: number) {
  return `${path}-panel-${index}`
}

function childPath(path: string, index: number) {
  return `${path}-${index}`
}

function triggerId(path: string, index: number): `${string}:${string}` {
  return `${panelId(path, index)}:${panelId(path, index + 1)}`
}

function onZoneHover(target: string, zone: DropZone) {
  emit('zone-enter', target, zone)
}

function onZoneDragLeave(event: DragEvent) {
  const zone = event.currentTarget as HTMLElement | null
  if (!zone)
    return

  const rect = zone.getBoundingClientRect()
  const hasLeftZone = event.clientX < rect.left
    || event.clientX > rect.right
    || event.clientY < rect.top
    || event.clientY > rect.bottom

  if (hasLeftZone)
    emit('zone-leave')
}

function zoneClass(target: string, zone: DropZone) {
  return props.hoverKey === zoneKey(target, zone) ? 'zone-active' : ''
}

function headerStackSize(node: SpikeLayoutNode, axis: 'horizontal' | 'vertical'): number {
  if (node.type === 'panel')
    return axis === 'vertical' ? TITLE_BAR_BLOCK_PX : TITLE_BAR_INLINE_PX

  const childSizes = node.children.map(child => headerStackSize(child, axis))
  if (childSizes.length === 0)
    return 0

  if (node.direction === axis)
    return childSizes.reduce((sum, size) => sum + size, 0) + SPLITTER_GUTTER_PX * (childSizes.length - 1)

  return Math.max(...childSizes)
}

function panelMinimums(node: SpikeLayoutNode): number[] {
  if (node.type !== 'split' || node.children.length === 0)
    return []

  const axis = node.direction === 'vertical' ? 'vertical' : 'horizontal'
  const minimumPixels = node.children.map(child => headerStackSize(child, axis))
  const totalMinimumPixels = minimumPixels.reduce((sum, size) => sum + size, 0)
  const fallbackExtent = totalMinimumPixels * 2
  const extent = Math.max(splitExtent.value, fallbackExtent)
  const mins = minimumPixels.map((pixels) => {
    return Math.min((pixels / extent) * 100, 100)
  })
  const total = mins.reduce((sum, size) => sum + size, 0)

  if (total <= 100)
    return mins

  return mins.map(size => (size / total) * 100)
}

function splitPanels(node: SpikeLayoutNode, path: string) {
  if (node.type !== 'split')
    return []

  const mins = panelMinimums(node)

  return node.children.map((_, index) => ({
    id: panelId(path, index),
    minSize: mins[index] ?? 0,
    maxSize: 100,
    collapsible: false,
  }))
}

function currentSizes(node: SpikeLayoutNode) {
  if (node.type !== 'split' || node.children.length === 0)
    return []
  const cached = props.sizesMap?.[node.id]
  if (cached && cached.length === node.children.length)
    return cached
  const each = 100 / node.children.length
  return node.children.map((_, idx) =>
    idx === node.children.length - 1 ? 100 - each * (node.children.length - 1) : each,
  )
}

onMounted(() => {
  if (!splitWrapper.value)
    return

  const updateExtent = () => {
    if (!splitWrapper.value || props.node.type !== 'split')
      return

    const rect = splitWrapper.value.getBoundingClientRect()
    splitExtent.value = props.node.direction === 'vertical' ? rect.height : rect.width
  }

  updateExtent()
  splitResizeObserver = new ResizeObserver(() => updateExtent())
  splitResizeObserver.observe(splitWrapper.value)
})

onBeforeUnmount(() => {
  splitResizeObserver?.disconnect()
})
</script>

<template>
  <div
    v-if="node.type === 'split'"
    ref="splitWrapper"
    class="dock-split-wrapper"
  >
    <Splitter.Root
      class="dock-split-root"
      :orientation="node.direction"
      :panels="splitPanels(node, path || 'root')"
      :size="currentSizes(node)"
      @resize="(d: { size: number[] }) => emit('split-resize', node.id, d.size)"
    >
    <template v-for="(child, idx) in node.children" :key="`${path || 'root'}-${idx}`">
      <Splitter.Panel :id="panelId(path || 'root', idx)">
        <div class="dock-child-fill">
          <LayoutDockNode
            :node="child"
            :path="childPath(path || 'root', idx)"
            :dragged-panel="draggedPanel"
            :hover-key="hoverKey"
            :sizes-map="sizesMap"
            @drag-start="(id, event) => emit('drag-start', id, event)"
            @drag-end="emit('drag-end')"
            @zone-enter="(target, zone) => emit('zone-enter', target, zone)"
            @zone-leave="emit('zone-leave')"
            @zone-drop="(target, zone, event) => emit('zone-drop', target, zone, event)"
            @split-resize="(splitId, sizes) => emit('split-resize', splitId, sizes)"
          />
        </div>
      </Splitter.Panel>

      <Splitter.ResizeTrigger
        v-if="idx < node.children.length - 1"
        :id="triggerId(path || 'root', idx)"
        class="dock-resize-trigger"
      >
        <Splitter.ResizeTriggerIndicator class="dock-resize-indicator" />
      </Splitter.ResizeTrigger>
    </template>
    </Splitter.Root>

    <div
      v-if="draggedPanel"
      class="split-drop-zones"
    >
      <div
        v-for="zone in ZONES"
        :key="`split-${node.id}-${zone}`"
        class="zone"
        :class="[`zone-${zone}`, zoneClass(node.id, zone)]"
        @dragenter.prevent="onZoneHover(node.id, zone)"
        @dragleave="onZoneDragLeave"
        @dragover.prevent="onZoneHover(node.id, zone)"
        @drop.prevent="emit('zone-drop', node.id, zone, $event)"
      />
    </div>
  </div>

  <div v-else class="dock-panel">
    <div
      class="dock-header"
      draggable="true"
      @dragstart="emit('drag-start', node.id, $event)"
      @dragend="emit('drag-end')"
    >
      <span>{{ panelLabels[node.id] }}</span>
    </div>

    <div class="dock-body">
      {{ panelLabels[node.id] }} panel
    </div>

    <div
      v-if="draggedPanel && draggedPanel !== node.id"
      class="drop-zones"
    >
      <div
        v-for="zone in ZONES"
        :key="`panel-${node.id}-${zone}`"
        class="zone"
        :class="[`zone-${zone}`, zoneClass(node.id, zone)]"
        @dragenter.prevent="onZoneHover(node.id, zone)"
        @dragleave="onZoneDragLeave"
        @dragover.prevent="onZoneHover(node.id, zone)"
        @drop.prevent="emit('zone-drop', node.id, zone, $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.dock-split-root {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  border-radius: 0.6rem;
  overflow: hidden;
}

.dock-split-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.dock-child-fill {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.dock-resize-trigger {
  z-index: 20;
  position: relative;
  flex-shrink: 0;
}

.dock-resize-indicator {
  position: absolute;
  inset: 0;
}

.dock-resize-trigger[data-orientation='horizontal'] {
  width: 12px;
  margin: 0 -6px;
  cursor: col-resize;
}

.dock-resize-trigger[data-orientation='horizontal'] .dock-resize-indicator {
  border-left: 1px dashed rgba(100, 116, 139, 0.7);
}

.dock-resize-trigger[data-orientation='vertical'] {
  height: 12px;
  margin: -6px 0;
  cursor: row-resize;
}

.dock-resize-trigger[data-orientation='vertical'] .dock-resize-indicator {
  border-top: 1px dashed rgba(100, 116, 139, 0.7);
}

.dock-panel {
  position: relative;
  min-width: 0;
  min-height: 0;
  width: 100%;
  height: 100%;
  border: 1px solid rgba(100, 116, 139, 0.5);
  background: rgba(15, 23, 42, 0.04);
  border-radius: 0.5rem;
  display: grid;
  grid-template-rows: min-content 1fr;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
}

.dock-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px dashed rgba(100, 116, 139, 0.55);
  font-size: 0.875rem;
  background: rgba(15, 23, 42, 0.07);
  cursor: grab;
  user-select: none;
}

.dock-header:active {
  cursor: grabbing;
}

.dock-body {
  display: grid;
  place-items: center;
  font-size: 0.875rem;
  opacity: 0.8;
  min-height: 0;
  height: 100%;
}

.drop-zones {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 30;
}

.split-drop-zones {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 40;
}

.split-drop-zones .zone-top,
.split-drop-zones .zone-bottom {
  left: 0;
  width: 100%;
  height: 18px;
}

.split-drop-zones .zone-left,
.split-drop-zones .zone-right {
  top: 0;
  height: 100%;
  width: 18px;
}

.zone {
  position: absolute;
  pointer-events: auto;
  transition: background 120ms ease, box-shadow 120ms ease;
  border: 1px dashed rgba(56, 189, 248, 0.2);
}

.zone-top,
.zone-bottom {
  left: 12%;
  width: 76%;
  height: 28%;
}

.zone-left,
.zone-right {
  top: 12%;
  height: 76%;
  width: 28%;
}

.zone-top { top: 0; }
.zone-bottom { bottom: 0; }
.zone-left { left: 0; }
.zone-right { right: 0; }

.zone-active {
  background: rgba(56, 189, 248, 0.22);
  box-shadow: inset 0 0 0 2px rgba(14, 165, 233, 0.6);
}
</style>
