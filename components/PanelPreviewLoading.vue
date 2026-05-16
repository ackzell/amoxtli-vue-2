<script setup lang="ts">
const ui = useUiState()

// Only access playground store when actually needed
let play: ReturnType<typeof usePlaygroundStore> | null = null

function getPlaygroundStore() {
  if (!play) {
    play = usePlaygroundStore()
  }
  return play
}

function getStep(status: PlaygroundStatus) {
  const playgroundStore = getPlaygroundStore()
  if (status === 'error' || (playgroundStore.status === 'error'))
    return 'error'
  const indexCurrent = playgroundStore.status !== 'init' ? PlaygroundStatusOrder.indexOf(playgroundStore.status) : -1
  const index = PlaygroundStatusOrder.indexOf(status)
  if (indexCurrent === index)
    return 'current'
  if (indexCurrent > index)
    return 'done'
  return 'todo'
}

function getStatusIcon(status: PlaygroundStatus) {
  const step = getStep(status)
  switch (step) {
    case 'error':
      return 'i-mynaui-x-hexagon-solid text-error text-l'
    case 'current':
      return 'i-svg-spinners-pulse-multiple scale-95 text-l'
    case 'done':
      return 'i-mynaui-check-hexagon-solid text-positive dark:text-positive-300 text-l'
    case 'todo':
      return 'i-mynaui-hexagon text-l  op40'
  }
}

function getTextClass(status: PlaygroundStatus) {
  const step = getStep(status)
  switch (step) {
    case 'error':
      return 'text-red'
    case 'current':
      return 'animate-pulse'
    case 'done':
      return 'text-positive dark:text-positive-300'
    case 'todo':
      return 'op40'
  }
}
</script>

<template>
  <div
    v-if="getPlaygroundStore().status !== 'ready'"
    flex="~ col items-center gap-2 justify-center"
    h-full
  >
    <template v-if="getPlaygroundStore().status === 'interactive'">
      <div flex="~ gap-2 items-center" text-lg>
        <div i-carbon-terminal text-2xl />
        {{ $t('interactive-terminal-mode') }}
      </div>
      <button
        title="Restart terminal"
        flex="~ gap-1 items-center"
        hover="bg-active text-blue op100"
        mx--1 rounded px1 op50
        @click="getPlaygroundStore().restartServer()"
      >
        <div i-carbon-rotate-360 text-lg />
        {{ $t('restart-server') }}
      </button>
    </template>
    <div v-else grid="~ cols-[max-content_1fr] gap-2 items-center justify-center" text-sm font-mono>
      <div :class="getStatusIcon('init')" />
      <span :class="getTextClass('init')">{{ $t('steps.initializing-webcontainer') }}</span>
      <div :class="getStatusIcon('mount')" />
      <span :class="getTextClass('mount')">{{ $t('steps.mounting-files') }}</span>
      <div :class="getStatusIcon('install')" />
      <span :class="getTextClass('install')" flex="~ gap-1 items-center">
        {{ $t('steps.installing-dependencies') }}
        <IconButton
          :class="getStep('install') === 'current' ? '' : 'op0 pointer-events-none'"
          my--1
          :tooltip="$t('terminal.toggle')"
          tooltip-placement="top"
          padding="sm"
          @click="ui.toggleTerminal()"
        >
          <div i-carbon-terminal text-xl />
        </IconButton>
      </span>
      <div :class="getStatusIcon('start')" />
      <span :class="getTextClass('start')">{{ $t('steps.starting-dev-server') }}</span>
      <div :class="getStatusIcon('polling')" />
      <span :class="getTextClass('polling')">{{ $t('steps.waiting-for-dev-server') }}</span>
    </div>
  </div>
</template>
