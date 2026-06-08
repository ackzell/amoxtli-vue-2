<script setup lang="ts">
import type { LogPayload } from '~/types/console-output'
import type { ClientInfo, FrameFunctions, ParentFunctions } from '~/types/rpc'
import { createBirpc } from 'birpc'

const ui = useUiState()
const colorMode = useColorMode()
const preview = usePreviewStore()

const iframe = ref<HTMLIFrameElement>()

// Set up birpc to communicate with iframe
const functions: ParentFunctions = {
  onReady(info: ClientInfo) {
    // Don't access playground store in docs mode
    preview.clientInfo = info
    preview.iframeReady = true
    preview.connecting = false
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
  window.addEventListener('message', handleColorModeRequest)
})

onBeforeUnmount(() => {
  window.removeEventListener('message', handleConsoleMessage)
  window.removeEventListener('message', handleColorModeRequest)
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

function handleColorModeRequest(event: MessageEvent) {
  if (typeof event.data !== 'object')
    return
  if (event.data.source === 'nuxt-playground-color-mode-request') {
    syncColorMode()
  }
}

function syncColorMode() {
  rpc?.onColorModeChange(colorMode.value)
  iframe.value?.contentWindow?.postMessage({
    source: 'nuxt-playground-color-mode',
    mode: colorMode.value,
  }, '*')
}

watch(
  colorMode,
  syncColorMode,
  { flush: 'sync' },
)

watch(() => preview.url, (newUrl) => {
  if (newUrl) {
    preview.iframeReady = false
    preview.connecting = true
  }
})

defineExpose({
  iframe,
})
</script>

<template>
  <iframe
    v-if="preview.url && preview.location.origin"
    ref="iframe"
    :src="preview.url"
    :class="{ 'pointer-events-none': ui.isPanelDragging }"
    bg-transparent h-full w-full inset-0 absolute allow="geolocation; microphone; camera; payment; autoplay; serial; cross-origin-isolated"
    sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
    @load="syncColorMode"
  />
</template>
