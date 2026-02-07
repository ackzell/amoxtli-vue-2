<script setup lang="ts">
import type { LogPayload } from '~/types/console-output'
import type { ClientInfo, FrameFunctions, ParentFunctions } from '~/types/rpc'
import { createBirpc } from 'birpc'

const ui = useUiState()
const play = usePlaygroundStore()
const colorMode = useColorMode()
const preview = usePreviewStore()

const iframe = ref<HTMLIFrameElement>()

// Set up birpc to communicate with iframe
const functions: ParentFunctions = {
  onReady(info: ClientInfo) {
    play.status = 'ready'
    preview.clientInfo = info
    syncColorMode()
  },
  onNavigate(path: string) {
    preview.location.fullPath = path
  },
}

let rpc: any = null

onMounted(() => {
  rpc = createBirpc<FrameFunctions, ParentFunctions>(functions, {
    post(payload) {
      iframe.value?.contentWindow?.postMessage({
        source: 'nuxt-playground-parent',
        payload,
      }, '*')
    },
    on(fn) {
      window.addEventListener('message', (event) => {
        if (typeof event.data !== 'object')
          return
        if (event.data.source !== 'nuxt-playground-frame')
          return
        fn(event.data.payload)
      })
    },
  })

  window.addEventListener('message', handleConsoleMessage)
})

onBeforeUnmount(() => {
  window.removeEventListener('message', handleConsoleMessage)
})

function handleConsoleMessage(event: MessageEvent) {
  if (typeof event.data !== 'object')
    return
  if (event.data.source !== 'nuxt-playground-frame')
    return

  const { method, args } = event.data.payload || {}
  if (method === 'onConsoleLog' && args?.[0]) {
    const payload = args[0] as LogPayload
    if (typeof window !== 'undefined' && (window as any).executeLog) {
      (window as any).executeLog(payload)
    }
  }
}

function syncColorMode() {
  rpc?.onColorModeChange(colorMode.value)
}

watch(
  colorMode,
  syncColorMode,
  { flush: 'sync' },
)

defineExpose({
  iframe,
})
</script>

<template>
  <iframe
    v-if="preview.url"
    ref="iframe"
    :src="preview.url"
    :style="play.status === 'ready' ? '' : 'opacity: 0.001; pointer-events: none;'"
    :class="{ 'pointer-events-none': ui.isPanelDragging }"
    absolute inset-0 h-full w-full bg-transparent allow="geolocation; microphone; camera; payment; autoplay; serial; cross-origin-isolated"
  />
</template>
