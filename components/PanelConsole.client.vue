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
  <div class="console-wrapper" grid="~ rows-[min-content_1fr]" h-full>
    <div
      data-dock-drag-handle="true"
      draggable="true"
      flex="~ gap-2 items-center"
      border="b base dashed"
      p2 pl4
      bg="dark:bgr-dark bgr-50"
      class="active:cursor-grabbing"
    >
      <div i-mynaui-code-square text-lg />
      <span text-sm>{{ $t('console-output.name') }}</span>
      <div flex-auto />
      <IconButton
        :tooltip="hideViteLogs ? $t('console-output.show-vite') : $t('console-output.hide-vite')"
        tooltip-placement="bottom"
        padding="sm"
        @click="hideViteLogs = !hideViteLogs"
      >
        <div text-lg :class="hideViteLogs ? 'i-mynaui-filter hover:i-mynaui-filter-solid' : 'i-mynaui-filter-solid'" />
      </IconButton>
      <IconButton
        tooltip-placement="bottom"
        padding="sm"
        z-100
        :tooltip="$t('console-output.clear')"
        @click="clearLunaConsole"
      >
        <div i-mynaui-trash text-lg hover:i-mynaui-trash-solid />
      </IconButton>
    </div>
    <div class="luna-container" role="log" :aria-label="$t('console-output.name')">
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
