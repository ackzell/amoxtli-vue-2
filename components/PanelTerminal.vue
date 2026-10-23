<script setup lang="ts">
const ui = useUiState()
const play = usePlaygroundStore()
</script>

<template>
  <div h-full grid="~ rows-[min-content_1fr]">
    <div
      data-dock-drag-handle="true"
      draggable="true"
      flex="~ gap-2 items-center"
      border="b base dashed"
      p2 pl4
      bg="dark:bgr-dark bgr-50"
      class="active:cursor-grabbing"
    >
      <div i-mynaui-terminal text-lg />
      <span text-xs font-mono>{{ $t('terminal.name') }}</span>
      <div flex-auto />
      <IconButton
        v-if="play.status !== 'init' && play.status !== 'mount'"
        :tooltip="$t('terminal.restart')"
        tooltip-placement="bottom"
        padding="sm"
        @click="play.restartServer(true)"
      >
        <div i-mynaui-refresh text-lg hover:i-mynaui-refresh-solid />
      </IconButton>
      <IconButton
        :tooltip="$t('terminal.hide')"
        tooltip-placement="bottom"
        padding="sm"
        @click="ui.toggleTerminal()"
      >
        <div i-mynaui-x text-lg hover:i-mynaui-x-solid />
      </IconButton>
    </div>
    <PanelTerminalClient />
  </div>
</template>
