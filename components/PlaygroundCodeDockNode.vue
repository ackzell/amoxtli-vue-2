<script setup lang="ts">
import type { DropZone } from '~/types/dnd-spike'
import type { CodePanelId, LayoutNode, LayoutSplit } from '~/types/layout'
import { Splitter } from '@ark-ui/vue'
import PanelConsole from './PanelConsole.client.vue'

defineOptions({
  name: 'PlaygroundCodeDockNode',
})

const props = defineProps<{
  node: LayoutNode
  draggedPanelId: CodePanelId | null
  activeDropZone: string | null
  sizesMap?: Record<string, number[]>
  path?: string
  showPreview: boolean
  showConsole: boolean
  showTerminal: boolean
}>()

const emit = defineEmits<{
  dragStart: [id: CodePanelId]
  dragEnd: []
  dropZoneEnter: [zoneId: string]
  dropZoneLeave: []
  zoneDrop: [draggedId: CodePanelId, targetId: string, zone: DropZone]
  splitResize: [splitId: string, sizes: number[]]
}>()

const ZONES: DropZone[] = ['top', 'bottom', 'left', 'right']

const panelLabels: Record<CodePanelId, string> = {
  editor: 'Editor',
  preview: 'Preview',
  console: 'Console',
  terminal: 'Terminal',
}

const splitWrapper = ref<HTMLElement | null>(null)
const splitExtent = ref(0)

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (!splitWrapper.value || props.node.type !== 'split')
    return

  const updateExtent = () => {
    if (!splitWrapper.value || props.node.type !== 'split')
      return
    const rect = splitWrapper.value.getBoundingClientRect()
    splitExtent.value = props.node.direction === 'vertical' ? rect.height : rect.width
  }

  updateExtent()
  resizeObserver = new ResizeObserver(updateExtent)
  resizeObserver.observe(splitWrapper.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

function panelId(path: string, index: number) {
  return `${path}-panel-${index}`
}

function childPath(path: string, index: number) {
  return `${path}-${index}`
}

function triggerId(path: string, index: number): `${string}:${string}` {
  return `${panelId(path, index)}:${panelId(path, index + 1)}`
}

function zoneClassname(zoneId: string) {
  return props.activeDropZone === zoneId ? 'zone-active' : ''
}

function panelMinimums(node: LayoutNode): number[] {
  if (node.type !== 'split' || node.children.length === 0)
    return []

  const minPixels = node.children.map((child) => {
    if (child.type === 'panel')
      return node.direction === 'vertical' ? 36 : 96
    return 96
  })

  const totalPixels = minPixels.reduce((sum, value) => sum + value, 0)
  const usableExtent = Math.max(splitExtent.value, totalPixels * 2, 1)
  const mins = minPixels.map(pixels => Math.min((pixels / usableExtent) * 100, 100))
  const total = mins.reduce((sum, value) => sum + value, 0)

  if (total <= 100)
    return mins

  return mins.map(value => (value / total) * 100)
}

function splitPanels(node: LayoutNode, path: string) {
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

function currentSizes(node: LayoutNode) {
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

function handleDragStart(e: DragEvent, panelId: CodePanelId) {
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/x-panel-id', panelId)
    e.dataTransfer.effectAllowed = 'move'
  }

  requestAnimationFrame(() => {
    emit('dragStart', panelId)
  })
}

function handleDrop(e: DragEvent, targetId: string, zone: DropZone) {
  const draggedId = e.dataTransfer?.getData('text/x-panel-id') as CodePanelId | undefined
  if (!draggedId)
    return
  emit('zoneDrop', draggedId, targetId, zone)
}

function laneStyle(index: number, total: number, side: 'top' | 'bottom' | 'left' | 'right') {
  const step = 100 / Math.max(total, 1)
  if (side === 'top' || side === 'bottom') {
    return {
      left: `${index * step}%`,
      width: `${step}%`,
    }
  }

  return {
    top: `${index * step}%`,
    height: `${step}%`,
  }
}

function splitChildrenWithIndex(node: LayoutNode) {
  if (node.type !== 'split')
    return []

  return node.children
    .map((child, idx) => ({ child, idx }))
    .filter(({ child }) => child.type === 'split')
}
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
      @resize="(d: { size: number[] }) => emit('splitResize', node.id, d.size)"
    >
      <template v-for="(child, idx) in node.children" :key="`${path || 'root'}-${idx}`">
        <Splitter.Panel :id="panelId(path || 'root', idx)">
          <div class="dock-child-fill">
            <PlaygroundCodeDockNode
              :node="child"
              :path="childPath(path || 'root', idx)"
              :dragged-panel-id="draggedPanelId"
              :active-drop-zone="activeDropZone"
              :sizes-map="sizesMap"
              :show-preview="showPreview"
              :show-console="showConsole"
              :show-terminal="showTerminal"
              @drag-start="(id) => emit('dragStart', id)"
              @drag-end="emit('dragEnd')"
              @drop-zone-enter="(zoneId) => emit('dropZoneEnter', zoneId)"
              @drop-zone-leave="emit('dropZoneLeave')"
              @zone-drop="(draggedId, targetId, zone) => emit('zoneDrop', draggedId, targetId, zone)"
              @split-resize="(splitId, sizes) => emit('splitResize', splitId, sizes)"
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
      v-if="draggedPanelId"
      class="split-zones-overlay"
    >
      <div
        v-for="zone in ZONES"
        :key="`split-${node.id}-${zone}`"
        class="zone"
        :class="[`zone-${zone}`, zoneClassname(`split:${node.id}:${zone}`)]"
        @dragenter.prevent="emit('dropZoneEnter', `split:${node.id}:${zone}`)"
        @dragover.prevent="emit('dropZoneEnter', `split:${node.id}:${zone}`)"
        @dragleave.prevent="emit('dropZoneLeave')"
        @drop.prevent="(e: DragEvent) => handleDrop(e, node.id, zone)"
      />
    </div>

    <div
      v-if="draggedPanelId"
      class="split-lane-zones"
    >
      <template v-if="node.direction === 'horizontal'">
        <div
          v-for="{ child, idx } in splitChildrenWithIndex(node)"
          :key="`lane-${node.id}-top-${child.id}`"
          class="lane-zone lane-zone-top"
          :class="zoneClassname(`lane:${child.id}:top`)"
          :style="laneStyle(idx, node.children.length, 'top')"
          @dragenter.prevent="emit('dropZoneEnter', `lane:${child.id}:top`)"
          @dragover.prevent="emit('dropZoneEnter', `lane:${child.id}:top`)"
          @dragleave.prevent="emit('dropZoneLeave')"
          @drop.prevent="(e: DragEvent) => handleDrop(e, child.id, 'top')"
        />
        <div
          v-for="{ child, idx } in splitChildrenWithIndex(node)"
          :key="`lane-${node.id}-bottom-${child.id}`"
          class="lane-zone lane-zone-bottom"
          :class="zoneClassname(`lane:${child.id}:bottom`)"
          :style="laneStyle(idx, node.children.length, 'bottom')"
          @dragenter.prevent="emit('dropZoneEnter', `lane:${child.id}:bottom`)"
          @dragover.prevent="emit('dropZoneEnter', `lane:${child.id}:bottom`)"
          @dragleave.prevent="emit('dropZoneLeave')"
          @drop.prevent="(e: DragEvent) => handleDrop(e, child.id, 'bottom')"
        />
      </template>

      <template v-else>
        <div
          v-for="{ child, idx } in splitChildrenWithIndex(node)"
          :key="`lane-${node.id}-left-${child.id}`"
          class="lane-zone lane-zone-left"
          :class="zoneClassname(`lane:${child.id}:left`)"
          :style="laneStyle(idx, node.children.length, 'left')"
          @dragenter.prevent="emit('dropZoneEnter', `lane:${child.id}:left`)"
          @dragover.prevent="emit('dropZoneEnter', `lane:${child.id}:left`)"
          @dragleave.prevent="emit('dropZoneLeave')"
          @drop.prevent="(e: DragEvent) => handleDrop(e, child.id, 'left')"
        />
        <div
          v-for="{ child, idx } in splitChildrenWithIndex(node)"
          :key="`lane-${node.id}-right-${child.id}`"
          class="lane-zone lane-zone-right"
          :class="zoneClassname(`lane:${child.id}:right`)"
          :style="laneStyle(idx, node.children.length, 'right')"
          @dragenter.prevent="emit('dropZoneEnter', `lane:${child.id}:right`)"
          @dragover.prevent="emit('dropZoneEnter', `lane:${child.id}:right`)"
          @dragleave.prevent="emit('dropZoneLeave')"
          @drop.prevent="(e: DragEvent) => handleDrop(e, child.id, 'right')"
        />
      </template>
    </div>
  </div>

  <div
    v-else
    class="dock-panel"
    @dragover.prevent
    @drop.prevent
  >
    <div
      class="dock-header"
      draggable="true"
      @dragstart="(e: DragEvent) => handleDragStart(e, node.id)"
      @dragend="emit('dragEnd')"
    >
      <span>{{ panelLabels[node.id] }}</span>
    </div>

    <div class="dock-body">
      <PanelEditor v-if="node.id === 'editor'" />
      <PanelPreview v-else-if="node.id === 'preview' && showPreview" />
      <PanelConsole v-else-if="node.id === 'console' && showConsole" />
      <PanelTerminal v-else-if="node.id === 'terminal' && showTerminal" />
    </div>

    <div
      v-if="draggedPanelId && draggedPanelId !== node.id"
      class="panel-zones-overlay"
    >
      <div
        v-for="zone in ZONES"
        :key="`panel-${node.id}-${zone}`"
        class="zone"
        :class="[`zone-${zone}`, zoneClassname(`panel:${node.id}:${zone}`)]"
        @dragenter.prevent="emit('dropZoneEnter', `panel:${node.id}:${zone}`)"
        @dragover.prevent="emit('dropZoneEnter', `panel:${node.id}:${zone}`)"
        @dragleave.prevent="emit('dropZoneLeave')"
        @drop.prevent="(e: DragEvent) => handleDrop(e, node.id, zone)"
      />
    </div>
  </div>
</template>

<style scoped>
.dock-split-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.dock-split-root {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  border-radius: 0;
  overflow: hidden;
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

.dock-resize-trigger[data-orientation='horizontal'] {
  width: 12px;
  margin: 0 -6px;
  cursor: col-resize;
}

.dock-resize-trigger[data-orientation='vertical'] {
  height: 12px;
  margin: -6px 0;
  cursor: row-resize;
}

.dock-resize-indicator {
  background: rgba(148, 163, 184, 0.55);
}

.dock-panel {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  border: 1px solid rgba(100, 116, 139, 0.45);
  border-radius: 0;
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
}

.dock-header {
  position: relative;
  z-index: 25;
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px dashed rgba(100, 116, 139, 0.45);
  font-size: 0.75rem;
  background: rgba(15, 23, 42, 0.06);
  cursor: grab;
  user-select: none;
  white-space: nowrap;
  -webkit-user-drag: element;
}

.dock-header:active {
  cursor: grabbing;
}

.dock-body {
  min-height: 0;
}

.split-zones-overlay,
.panel-zones-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 40;
}

.split-zones-overlay {
  z-index: 50;
}

.split-lane-zones {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 52;
}

.zone {
  position: absolute;
  pointer-events: auto;
  border: 2px dashed rgba(56, 189, 248, 0.2);
  border-radius: 0.25rem;
  transition: all 100ms ease;
}

.zone-active {
  background: rgba(56, 189, 248, 0.15);
  border-color: rgba(14, 165, 233, 0.6);
  box-shadow: inset 0 0 0 1px rgba(56, 189, 248, 0.4);
}

.lane-zone {
  position: absolute;
  pointer-events: auto;
  border: 1px dashed rgba(56, 189, 248, 0.35);
  border-radius: 0.25rem;
  transition: all 100ms ease;
}

.lane-zone-top {
  top: 0;
  height: 32px;
}

.lane-zone-bottom {
  bottom: 0;
  height: 32px;
}

.lane-zone-left {
  left: 0;
  width: 32px;
}

.lane-zone-right {
  right: 0;
  width: 32px;
}

.panel-zones-overlay .zone-top {
  top: 0;
  left: 10%;
  width: 80%;
  height: 25%;
}

.panel-zones-overlay .zone-bottom {
  bottom: 0;
  left: 10%;
  width: 80%;
  height: 25%;
}

.panel-zones-overlay .zone-left {
  top: 10%;
  left: 0;
  width: 25%;
  height: 80%;
}

.panel-zones-overlay .zone-right {
  top: 10%;
  right: 0;
  width: 25%;
  height: 80%;
}

.split-zones-overlay .zone-top {
  top: 0;
  left: 0;
  width: 100%;
  height: 28px;
}

.split-zones-overlay .zone-bottom {
  bottom: 0;
  left: 0;
  width: 100%;
  height: 28px;
}

.split-zones-overlay .zone-left {
  top: 0;
  left: 0;
  width: 28px;
  height: 100%;
}

.split-zones-overlay .zone-right {
  top: 0;
  right: 0;
  width: 28px;
  height: 100%;
}
</style>
