<script setup lang="ts">
import type { LogPayload } from '../types/console-output'
import { onMounted, ref, useTemplateRef } from 'vue'

const lunaRef = useTemplateRef('luna-ref')
const hideViteLogs = ref(false)

const consoleOutput = useConsoleOutput({ withDomReconstruction: true })

function isViteLog(data: any[]) {
  const first = data?.[0]
  return typeof first === 'string' && first.startsWith('[vite]')
}

onMounted(async () => {
  if (!lunaRef.value)
    return

  await consoleOutput.initConsole(lunaRef.value)

  if (typeof window !== 'undefined') {
    (window as any).executeLog = ({ logLevel, data = [] }: LogPayload) => {
      if (hideViteLogs.value && isViteLog(data))
        return
      consoleOutput.addLog(logLevel, data)
    }
  }
})

function clearLunaConsole() {
  consoleOutput.clearLogs(true)
}
</script>

<template>
  <div class="console-wrapper" h-full grid="~ rows-[min-content_1fr]">
    <div
      data-dock-drag-handle="true"
      draggable="true"
      flex="~ gap-2 items-center"
      border="b base dashed"
      p2 pl4
      bg="dark:bgr-dark bgr-50"
      class="active:cursor-grabbing"
    >
      <div i-carbon-cics-program />
      <span text-sm>{{ $t('console-output.name') }}</span>
      <div flex-auto />
      <IconButton
        :tooltip="hideViteLogs ? $t('console-output.show-vite') : $t('console-output.hide-vite')"
        tooltip-placement="bottom"
        padding="sm"
        @click="hideViteLogs = !hideViteLogs"
      >
        <div :class="hideViteLogs ? 'i-carbon-filter' : 'i-carbon-filter-remove'" />
      </IconButton>
      <IconButton
        :tooltip="$t('console-output.clear')"
        tooltip-placement="bottom"
        padding="sm"
        @click="clearLunaConsole"
      >
        <div i-carbon-clean />
      </IconButton>
    </div>
    <div class="luna-container">
      <div ref="luna-ref" />
    </div>
  </div>
</template>

<style scoped>
.console-wrapper {
  height: 100%;
  border-left: 1px solid var(--border);
  min-height: 0;
}

.luna-container {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  overflow: auto;
}

.luna-console-theme-dark {
  background-color: var(--bg) !important;
}
</style>
