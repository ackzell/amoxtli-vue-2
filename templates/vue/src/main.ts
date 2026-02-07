import type { ClientInfo, FrameFunctions, ParentFunctions } from '../../../types/rpc'
import { createBirpc } from 'birpc'
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)

// Initialize RPC bridge to communicate with parent frame (learn.nuxt.com)
const functions: FrameFunctions = {
  onColorModeChange(mode) {
    document.documentElement.classList.toggle('dark', mode === 'dark')
  },
}

const rpc = createBirpc<ParentFunctions, FrameFunctions>(functions, {
  post(payload) {
    window.parent.postMessage({
      source: 'nuxt-playground-frame',
      payload,
    }, '*')
  },
  on(fn) {
    window.addEventListener('message', (event) => {
      if (typeof event.data !== 'object')
        return
      if (event.data.source !== 'nuxt-playground-parent')
        return
      fn(event.data.payload)
    })
  },
})

// Signal to parent that Vue app is ready with actual installed versions
let vueVersion = 'unknown'
try {
  const vuePackage = await fetch('/node_modules/vue/package.json').then(r => r.json())
  vueVersion = vuePackage.version
} catch (e) {
  // Fallback: try to read from window if available
  vueVersion = (window as any).__vueVersion || 'unknown'
}

const clientInfo: ClientInfo = {
  versionVue: vueVersion,
  versionNuxt: 'N/A',
}
rpc.onReady(clientInfo)

app.mount('#app')
