<script setup lang="ts">
const ui = useUiState()
</script>

<template>
  <div border="b t base solid" bg-faded px2 py1.5 flex="~ wrap items-center justify-end gap-1.5">
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
</template>
