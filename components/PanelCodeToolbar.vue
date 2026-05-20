<script setup lang="ts">
const ui = useUiState()
const fm = useFileManagerStore()
</script>

<template>
  <div border="b t base solid" bg-faded px2 py1.5 flex="~ wrap items-center justify-between gap-1.5">
    <div v-if="fm" flex-1>
      <IconButton
        tooltip="Save"
        tooltip-placement="bottom"
        @click="fm.saveSnapshot({
          type: 'manual',
          message: 'User triggered save from toolbar',
        })"
      >
        <div text-md i-carbon-save />
      </IconButton>

      <IconButton
        tooltip="Snapshots"
        tooltip-placement="bottom"
        @click="ui.toggleSnapshotSidebar()"
      >
        <div text-md i-mynaui-clock-hexagon />
      </IconButton>
    </div>
    <div>
      <IconButton
        :tooltip="`${ui.showPreview ? 'Hide' : 'Show'} preview`"
        tooltip-placement="bottom"
        :class="ui.showPreview ? '' : 'op50'"
        @click="ui.togglePreview()"
      >
        <div text-md i-carbon-wikis />
      </IconButton>

      <IconButton
        tooltip="Toggle Console"
        tooltip-placement="bottom"
        :class="ui.showConsole ? '' : 'op50'"
        @click="ui.toggleConsole()"
      >
        <div text-md i-carbon-cics-program />
      </IconButton>

      <IconButton
        :tooltip="$t('terminal.toggle')"
        tooltip-placement="bottom"
        :class="ui.showTerminal ? '' : 'op50'"
        @click="ui.toggleTerminal()"
      >
        <div text-md i-carbon-terminal />
      </IconButton>
    </div>
  </div>
</template>
