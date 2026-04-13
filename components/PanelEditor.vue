<script setup lang="ts">
import { Splitter } from '@ark-ui/vue'
import { filesToVirtualFsTree } from '~/templates/utils'

const play = usePlaygroundStore()
const ui = useUiState()
const guide = useGuideStore()

const files = computed(() => Array
  .from(play.files.values())
  .filter(file => !isFileIgnored(file.filepath, guide.ignoredFiles)),
)

const directory = computed(() => filesToVirtualFsTree(files.value))

const input = ref<string>('')

watch(
  () => [play.fileSelected, guide.currentGuide, guide.showingSolution],
  () => {
    input.value = play.fileSelected?.read() || ''
  },
)

const onTextInput = useDebounceFn(_onTextInput, 500)
function _onTextInput() {
  if (input.value != null)
    play?.fileSelected?.write(input.value)
}

function startDragging() {
  ui.isPanelDragging = true
}

function onResize(e: { size: number[] }) {
  ui.panelFileTree = e.size[0] ?? 0
}

function endDragging(e: { size: number[] }) {
  ui.isPanelDragging = false
  ui.panelFileTree = e.size[0] ?? 0
}

const panels = [
  { id: 'file-tree-panel', minSize: 0, maxSize: 100, collapsible: true, collapsedSize: 0 },
  { id: 'editor-pane', minSize: 0, maxSize: 100, collapsible: true, collapsedSize: 0 },
]

const sizes = computed<number[]>({
  get() {
    const fileTree = guide.features.fileTree === false ? 0 : ui.panelFileTree
    return [fileTree, Math.max(0, 100 - fileTree)]
  },
  set(value) {
    ui.panelFileTree = value[0] ?? 0
  },
})
</script>

<template>
  <Splitter.Root
    :panels="panels"
    :size="sizes"
    of-hidden
    @resize-start="startDragging"
    @resize="onResize"
    @resize-end="endDragging"
  >
    <Splitter.Panel
      id="file-tree-panel"
      flex="~ col" h-full of-auto
    >
      <div
        h-full
        grid="~ rows-[min-content_1fr]"
      >
        <div
          flex="~ gap-2 items-center"
          border="b base dashed"
          bg-faded px4 py2
        >
          <div i-ph-tree-structure-duotone flex-none />
          <span text-sm>{{ $t('files') }}</span>
        </div>
        <div py2>
          <PanelEditorFileSystemTree
            v-model="play.fileSelected"
            :directory="directory"
            :depth="-1"
          />
        </div>
      </div>
    </Splitter.Panel>

    <Splitter.ResizeTrigger
      v-if="guide.features.fileTree !== false"
      id="file-tree-panel:editor-pane"
    />

    <Splitter.Panel id="editor-pane">
      <div
        h-full
        grid="~ rows-[min-content_1fr]"
      >
        <div
          flex="~ gap-2 items-center"
          border="b base dashed"
          bg-faded px4 py2
        >
          <FileIcon :path="play.fileSelected?.filepath || ''" />
          <span flex-auto text-sm>{{ play.fileSelected?.filepath || $t('editor') }}</span>
          <ButtonShowSolution
            my--1 mr--3 flex-none rounded px2 py1 text-sm op50
            hover="bg-active op100"
          />
        </div>
        <LazyPanelEditorMonaco
          v-if="play.fileSelected"
          v-model="input"
          :filepath="play.fileSelected.filepath"
          h-full w-full
          @change="onTextInput"
        />
      </div>
    </Splitter.Panel>
  </Splitter.Root>
</template>
