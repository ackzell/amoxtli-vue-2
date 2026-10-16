import type { ClientInfo, FrameFunctions, ParentFunctions } from '../../../types/rpc'
import { createBirpc } from 'birpc'
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)

// The challenge runtime imports @vitest/expect + chai, which are heavy and
// (in the container dev server) fragile to serve. Load it lazily on the first
// parent-challenge message, mirroring the html template.
//
// The host may fire `run-suite` before that lazy import finishes (or right
// after a preview reload, before this listener exists again). Those requests
// would otherwise be dropped and the host would time out, so queue them and
// replay once the harness listener is registered.
let challengeStarted = false
let harnessReady = false
const pendingRunSuites: any[] = []

window.addEventListener('message', (event) => {
  const data = event.data
  if (typeof data !== 'object' || data === null)
    return
  if (data.source !== 'nuxt-playground-parent-challenge')
    return
  // Once the harness is up it owns every challenge message itself.
  if (harnessReady)
    return
  if (data.payload?.method === 'run-suite')
    pendingRunSuites.push(data)
  if (challengeStarted)
    return
  challengeStarted = true
  import('../__challenge__/harness').then(({ startChallengeRuntime }) => {
    startChallengeRuntime('/__challenge__/suite.ts')
    harnessReady = true
    for (const queued of pendingRunSuites.splice(0))
      window.postMessage(queued, '*')
  }).catch(() => {
    // Guard has already been armed; if the import fails the host will get a
    // suite-result failure on its next run-suite instead of a crashing preview.
    pendingRunSuites.length = 0
  })
})

// Initialize RPC bridge to communicate with parent frame (amoxtli-vue)
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
}
catch (e) {
  vueVersion = (window as any).__vueVersion || 'unknown'
}

const clientInfo: ClientInfo = {
  versionVue: vueVersion,
  versionNuxt: 'N/A',
}
rpc.onReady(clientInfo)

app.mount('#app')
