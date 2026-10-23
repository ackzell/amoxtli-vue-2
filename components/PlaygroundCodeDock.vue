<script setup lang="ts">
import type { DropZone, LayoutNode } from '@calmecac-vue/playground-layout'
import type { CodePanelId } from '~/stores/ui'
import { PlaygroundDockNode } from '@calmecac-vue/playground-layout'
import '@calmecac-vue/playground-layout/style.css'

defineProps<{
  node: LayoutNode<CodePanelId>
  draggedPanelId: CodePanelId | null
  activeDropZone: string | null
  sizesMap?: Record<string, number[]>
}>()

const emit = defineEmits<{
  dragStart: [id: CodePanelId]
  dragEnd: []
  dropZoneEnter: [zoneId: string]
  dropZoneLeave: []
  zoneDrop: [draggedId: CodePanelId, targetId: string, zone: DropZone]
  splitResize: [splitId: string, sizes: number[]]
}>()

// Async panel imports keep the playground stores (WebContainer, terminal,
// preview) out of the initial bundle until their panel is actually rendered.
const PanelEditorLazy = defineAsyncComponent({
  loader: () => import('./PanelEditor.vue'),
  loadingComponent: { template: '<div />' },
  delay: 200,
  timeout: 3000,
})
const PanelPreviewLazy = defineAsyncComponent({
  loader: () => import('./PanelPreview.vue'),
  loadingComponent: { template: '<div />' },
  delay: 200,
  timeout: 3000,
})
const PanelConsoleLazy = defineAsyncComponent({
  loader: () => import('./PanelConsole.client.vue'),
  loadingComponent: { template: '<div />' },
  delay: 200,
  timeout: 3000,
})
const PanelTerminalLazy = defineAsyncComponent({
  loader: () => import('./PanelTerminal.vue'),
  loadingComponent: { template: '<div />' },
  delay: 200,
  timeout: 3000,
})
</script>

<template>
  <PlaygroundDockNode
    :node="node"
    :dragged-panel-id="draggedPanelId"
    :active-drop-zone="activeDropZone"
    :sizes-map="sizesMap"
    @drag-start="(id) => emit('dragStart', id as CodePanelId)"
    @drag-end="emit('dragEnd')"
    @drop-zone-enter="(zoneId) => emit('dropZoneEnter', zoneId)"
    @drop-zone-leave="emit('dropZoneLeave')"
    @zone-drop="(draggedId, targetId, zone) => emit('zoneDrop', draggedId as CodePanelId, targetId, zone)"
    @split-resize="(splitId, sizes) => emit('splitResize', splitId, sizes)"
  >
    <template #editor>
      <PanelEditorLazy />
    </template>
    <template #preview>
      <PanelPreviewLazy />
    </template>
    <template #console>
      <PanelConsoleLazy />
    </template>
    <template #terminal>
      <PanelTerminalLazy />
    </template>
  </PlaygroundDockNode>
</template>
