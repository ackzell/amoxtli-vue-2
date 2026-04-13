<script setup lang="ts">
const ui = useUiState()
</script>

<template>
  <div border="b base dashed" bg-faded px2 py1.5 flex="~ wrap items-center gap-1.5">
    <button
      rounded p2
      :title="`${ui.showPreview ? 'Hide' : 'Show'} preview`"
      hover="bg-active"
      :class="ui.showPreview ? '' : 'op50'"
      @click="ui.togglePreview()"
    >
      <div i-ph-monitor-play-duotone text-xl />
    </button>

    <button
      rounded p2
      title="Toggle Console"
      hover="bg-active"
      :class="ui.showConsole ? '' : 'op50'"
      @click="ui.toggleConsole()"
    >
      <div i-ph-terminal-duotone text-xl />
    </button>

    <button
      rounded p2
      :title="$t('terminal.toggle')"
      hover="bg-active"
      :class="ui.showTerminal ? '' : 'op50'"
      @click="ui.toggleTerminal()"
    >
      <div i-ph-terminal-window-duotone text-xl />
    </button>
  </div>
</template>
