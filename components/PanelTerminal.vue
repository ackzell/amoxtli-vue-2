<script setup lang="ts">
const ui = useUiState()
</script>

<template>
  <div h-full grid="~ rows-[min-content_1fr]">
    <div
      data-dock-drag-handle="true"
      draggable="true"
      flex="~ gap-2 items-center"
      border="b base dashed"
      bg-faded p2 pl4
    >
      <div i-carbon-terminal />
      <span text-sm>{{ $t('terminal.name') }}</span>
      <div flex-auto />
      <IconButton
        v-if="false"
        :tooltip="$t('terminal.restart')"
        tooltip-placement="bottom"
        padding="sm"
        @click="() => {}"
      >
        <div i-carbon-rotate-360 />
      </IconButton>
      <IconButton
        :tooltip="$t('terminal.hide')"
        tooltip-placement="bottom"
        padding="sm"
        @click="ui.toggleTerminal()"
      >
        <div i-carbon-close />
      </IconButton>
    </div>
    <PanelTerminalClient />
  </div>
</template>
