<script setup lang="ts">
const ui = useUiState()
const fm = useFileManagerStore()
</script>

<template>
  <div
    border="b t base solid" px2 py1.5
    bg="dark:bgr-900 bgr-50"
    flex="~ wrap items-center justify-between gap-1.5"
  >
    <div v-if="fm" flex-1>
      <IconButton
        tooltip="Save"
        tooltip-placement="bottom"
        @click="fm.saveSnapshot({
          type: 'manual',
          message: 'User triggered save from toolbar',
        })"
      >
        <div i-mynaui-save text-lg hover:i-mynaui-save-solid />
      </IconButton>

      <IconButton
        tooltip="Snapshots"
        tooltip-placement="bottom"
        @click="ui.toggleSnapshotSidebar()"
      >
        <div text-lg :class="ui.isSnapshotSidebarOpen ? 'i-mynaui-clock-hexagon-solid' : 'i-mynaui-clock-hexagon hover:i-mynaui-clock-hexagon-solid'" />
      </IconButton>
    </div>
    <div>
      <IconButton
        :tooltip="`${ui.showPreview ? 'Hide' : 'Show'} preview`"
        tooltip-placement="bottom"
        :class="ui.showPreview ? '' : 'op50'"
        @click="ui.togglePreview()"
      >
        <div text-lg :class="ui.showPreview ? 'i-mynaui-circle-solid' : 'i-mynaui-circle hover:i-mynaui-circle-solid'" />
      </IconButton>

      <IconButton
        tooltip="Toggle Console"
        tooltip-placement="bottom"
        :class="ui.showConsole ? '' : 'op50'"
        @click="ui.toggleConsole()"
      >
        <div text-lg :class="ui.showConsole ? 'i-mynaui-code-square-solid' : 'i-mynaui-code-square hover:i-mynaui-code-square-solid'" />
      </IconButton>

      <IconButton
        :tooltip="$t('terminal.toggle')"
        tooltip-placement="bottom"
        :class="ui.showTerminal ? '' : 'op50'"
        @click="ui.toggleTerminal()"
      >
        <div text-lg :class="ui.showTerminal ? 'i-mynaui-terminal-solid' : 'i-mynaui-terminal hover:i-mynaui-terminal-solid'" />
      </IconButton>
    </div>
  </div>
</template>
