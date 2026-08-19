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
        if (event.source !== iframe.value?.contentWindow)
          return
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
  if (event.source !== iframe.value?.contentWindow)
    return
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

/**
 * TEMPORARY DEBUG — Probe 1: Fetch the served @vite/client module through the
 * virtual proxy and check if the almostnode HMR bridge shim was injected.
 * Results go to browser console + xterm panel via amoxtli:vite-diag event.
 */
async function checkHmrBridge() {
  if (!(window as any).__almostnodeDebug)
    return
  if (!preview.url)
    return
  try {
    const clientUrl = new URL('@vite/client', preview.url).href
    const response = await fetch(clientUrl)
    const text = await response.text()
    const hasShim = text.includes('window.__almostnodeViteHmrBridge')
    const detail = [
      `[HMR-DIAG] Probe 1 — @vite/client from: ${clientUrl}`,
      `[HMR-DIAG] length: ${text.length}`,
      `[HMR-DIAG] HAS_SHIM: ${hasShim}`,
      `[HMR-DIAG] first 200: ${text.slice(0, 200)}`,
    ].join('\n')
    // eslint-disable-next-line no-console
    console.log(detail)
    window.dispatchEvent(new CustomEvent<string>('amoxtli:vite-diag', { detail }))
  }
  catch (e) {
    const detail = `[HMR-DIAG] Probe 1 FAILED: ${e instanceof Error ? e.message : e}`
    console.error(detail)
    window.dispatchEvent(new CustomEvent<string>('amoxtli:vite-diag', { detail }))
  }
}

function onLoad() {
  syncColorMode()
  checkHmrBridge()
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
    v-if="preview.url && preview.location.origin"
    ref="iframe"
    :src="preview.url"
    :class="{ 'pointer-events-none': ui.isPanelDragging }"
    bg-transparent h-full w-full inset-0 absolute allow="geolocation; microphone; camera; payment; autoplay; serial; cross-origin-isolated"
    @load="onLoad"
  />
</template>
