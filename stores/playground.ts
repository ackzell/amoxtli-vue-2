import type { WebContainer, WebContainerProcess } from '@webcontainer/api'
import type { Raw } from 'vue'
import { filesToWebContainerFs } from '~/templates/utils'
import { VirtualFile } from '../structures/VirtualFile'
import { CONSOLE_INTERCEPTOR_CODE } from '../templates/console-interceptor'

export const PlaygroundStatusOrder = [
  'init',
  'mount',
  'install',
  'start',
  'polling',
  'ready',
  'interactive',
] as const

export type PlaygroundStatus = typeof PlaygroundStatusOrder[number] | 'error'

const DEV_SERVER_PORT = 5173

export const usePlaygroundStore = defineStore('playground', () => {
  // console.warn('🔍 [DEBUG] Playground store being created/accessed', {
  //   stack: new Error('Playground store access stack').stack?.split('\n').slice(1, 5).join('\n'),
  // })

  const preview = usePreviewStore()

  const _isInitialized = ref(false)
  const status = ref<PlaygroundStatus>('init')
  const error = shallowRef<{ message: string }>()
  const currentProcess = shallowRef<Raw<WebContainerProcess | undefined>>()
  const webcontainer = shallowRef<Raw<WebContainer>>()

  let templatesMap: Record<string, Record<string, string>> = {
    vue: {},
    html: {},
  }
  const files = shallowReactive<Raw<Map<string, VirtualFile>>>(new Map())
  const fileSelected = shallowRef<Raw<VirtualFile>>()

  let _promiseInit: Promise<void> | undefined
  let hasInstalled = false
  let lastInstalledPackageJson = ''

  async function init() {
    // console.warn('🔍 [DEBUG] Playground init() called', {
    //   isClient: import.meta.client,
    //   isInitialized: _isInitialized.value,
    //   stack: new Error('Playground init stack').stack?.split('\n').slice(1, 5).join('\n'),
    // })
    if (!import.meta.client || _isInitialized.value)
      return

    const [
      wc,
      vueTemplate,
      htmlTemplate,
    ] = await Promise.all([
      import('@webcontainer/api')
        .then(({ WebContainer }) => WebContainer.boot()),

      import('../templates')
        .then(r => r.templates.vue()),

      import('../templates')
        .then(r => r.templates.html()),
    ])

    templatesMap = {
      vue: vueTemplate,
      html: htmlTemplate,
    }
    webcontainer.value = wc

    // Create VirtualFile objects from the default (vue) template
    Object.entries(vueTemplate)
      .forEach(([path, content]) => {
        const file = new VirtualFile(path, content, wc)
        if (path.endsWith('.html'))
          file.fsTransform = injectHtmlScripts
        files.set(path, file)
      })

    wc.on('server-ready', async (port, url) => {
      // Dev server might listen on multiple ports, we need the main one
      if (port === DEV_SERVER_PORT) {
        preview.location = {
          origin: url,
          fullPath: preview.pendingFullPath,
        }
        preview.updateUrl()
        status.value = 'ready'
      }
    })

    wc.on('error', (err) => {
      error.value = err
      status.value = 'error'
    })

    status.value = 'mount'
    await wc.mount(filesToWebContainerFs([...files.values()]))

    startServer()

    // In dev, when doing HMR, we kill the previous process while reusing the same WebContainer
    if (import.meta.hot) {
      import.meta.hot.accept(() => {
        killPreviousProcess()
      })
    }

    _isInitialized.value = true
  }

  let abortController: AbortController | undefined

  function killPreviousProcess() {
    abortController?.abort()
    abortController = undefined
    currentProcess.value?.kill()
    currentProcess.value = undefined
  }

  async function startServer(reinstall = false) {
    if (!import.meta.client)
      return

    killPreviousProcess()

    const wc = webcontainer.value!
    abortController = new AbortController()
    const signal = abortController.signal

    if (reinstall) {
      hasInstalled = false
    }
    else if (!hasInstalled && !lastInstalledPackageJson) {
      // Fresh boot / page refresh: check if node_modules already exists
      // from a previous session so we can skip install entirely.
      // When lastInstalledPackageJson is set it means mount() cleared
      // hasInstalled due to a dep change — we must install in that case.
      try {
        const nodeModEntries = await wc.fs.readdir('node_modules')
        if (nodeModEntries && nodeModEntries.length > 0) {
          hasInstalled = true
          const pkgFile = files.get('package.json')
          if (pkgFile)
            lastInstalledPackageJson = pkgFile.read()
          status.value = 'start'
        }
      }
      catch {
        // node_modules doesn't exist or error, need to install
        hasInstalled = false
      }
    }

    if (!hasInstalled)
      await launchInstallProcess(wc, signal)

    if (hasInstalled)
      await launchDevServerProcess(wc, signal)

    await launchInteractiveProcess(wc, signal)
  }

  async function spawn(wc: WebContainer, command: string, args: string[] = []) {
    if (currentProcess.value)
      throw new Error('A process is already running')
    const process = await wc.spawn(command, args, {
      env: {
        DEV_SERVER_PORT: DEV_SERVER_PORT.toString(),
      },
    })
    currentProcess.value = process
    return process.exit.then((r) => {
      if (currentProcess.value === process)
        currentProcess.value = undefined
      return r
    })
  }

  async function launchInstallProcess(wc: WebContainer, signal: AbortSignal) {
    if (signal.aborted)
      return

    status.value = 'install'

    const installExitCode = await spawn(wc, 'pnpm', ['install', '--prefer-offline'])
    if (signal.aborted)
      return

    if (installExitCode !== 0) {
      status.value = 'error'
      error.value = {
        message: `Unable to run npm install, exit as ${installExitCode}`,
      }
      console.error('Unable to run npm install')
      return false
    }

    hasInstalled = true
    // Track what was installed so we can detect dep changes later
    const pkgFile = files.get('package.json')
    if (pkgFile)
      lastInstalledPackageJson = pkgFile.read()
  }

  async function launchDevServerProcess(wc: WebContainer, signal: AbortSignal) {
    if (signal.aborted)
      return
    status.value = 'start'

    // Check if this is a Nuxt project by looking for nuxt.config.ts or .nuxt dir
    const isNuxtProject = (() => {
      for (const file of files.keys()) {
        if (file === 'nuxt.config.ts' || file.startsWith('.nuxt/'))
          return true
      }
      return false
    })()

    const args = ['run', 'dev']
    // Only pass --no-qr for Nuxt projects
    if (isNuxtProject)
      args.push('--no-qr')

    const serverReady = new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        // Fallback: after 5 seconds, assume server is ready even if event didn't fire
        if (status.value === 'start') {
          status.value = 'ready'
        }
        resolve()
      }, 5000)

      const checkReady = () => {
        if (status.value === 'ready') {
          clearTimeout(timeout)
          resolve()
        }
      }

      // Check every 100ms if status changed to ready
      const interval = setInterval(checkReady, 100)
      signal.addEventListener('abort', () => {
        clearTimeout(timeout)
        clearInterval(interval)
      })
    })

    await spawn(wc, 'pnpm', args)
    await serverReady
  }

  async function launchInteractiveProcess(wc: WebContainer, signal: AbortSignal) {
    if (signal.aborted)
      return
    status.value = 'interactive'
    await spawn(wc, 'jsh')
  }

  const CONSOLE_INTERCEPTOR_SCRIPT = `<script type="module">
          ${CONSOLE_INTERCEPTOR_CODE}
        </script>`

  function injectHtmlScripts(content: string): string {
    if (!content.includes('console-interceptor')) {
      if (content.includes('</head>')) {
        return content.replace('</head>', `${CONSOLE_INTERCEPTOR_SCRIPT}\n</head>`)
      }
      return `${CONSOLE_INTERCEPTOR_SCRIPT}\n${content}`
    }
    return content
  }

  async function _updateOrCreateFile(filepath: string, content: string) {
    const file = files.get(filepath)
    if (file) {
      if (filepath.endsWith('.html'))
        file.fsTransform = injectHtmlScripts
      if (file.read() !== content)
        await file.write(content)
      return file
    }
    else {
      const newFile = new VirtualFile(filepath, content, webcontainer.value!)
      if (filepath.endsWith('.html'))
        newFile.fsTransform = injectHtmlScripts
      files.set(filepath, newFile)
      await newFile.write(content)
      return newFile
    }
  }

  /**
   * Mount files to WebContainer.
   * This will do a diff with the current files and only update the ones that changed.
   * If package.json changed, triggers a reinstall + server restart.
   */
  async function mount(map: Record<string, string>, templateName: 'vue' | 'html' = 'vue') {
    const templates = templatesMap[templateName] || templatesMap.vue || {}
    const objects = {
      ...templates,
      ...map,
    }

    // Check if package.json is changing BEFORE mounting files
    const newPackageJson = objects['package.json'] || ''
    const depsChanged = hasInstalled && newPackageJson !== lastInstalledPackageJson

    // Kill the running server early so it doesn't try to serve
    // incompatible files while we're updating
    if (depsChanged) {
      killPreviousProcess()
      hasInstalled = false
      // Clear the preview URL so the iframe unmounts entirely.
      // Without this, the iframe keeps showing stale content from the
      // old server until the new one fully loads.
      preview.url = ''
      status.value = 'mount'
    }

    await Promise.all([
      // update or create files
      ...Object.entries(objects)
        .map(async ([filepath, content]) => {
          await _updateOrCreateFile(filepath, content)
        }),
      // remove extra files
      ...Array.from(files.keys())
        .filter(filepath => !(filepath in objects))
        .map(async (filepath) => {
          const file = files.get(filepath)
          await file?.remove()
          files.delete(filepath)
        }),
    ])

    // Reinstall and restart the dev server
    if (depsChanged) {
      startServer()
    }
  }

  // Computed properties that return safe values when not initialized
  const safeStatus = computed(() => _isInitialized.value ? status.value : 'init')
  const safeWebcontainer = computed(() => _isInitialized.value ? webcontainer.value : null)
  const safeError = computed(() => _isInitialized.value ? error.value : undefined)
  const safeCurrentProcess = computed(() => _isInitialized.value ? currentProcess.value : undefined)

  return {
    init,
    webcontainer: safeWebcontainer,
    status: safeStatus,
    error: safeError,
    currentProcess: safeCurrentProcess,

    restartServer: startServer,

    files,
    fileSelected,
    mount,
  }
})

export type PlaygroundStore = ReturnType<typeof usePlaygroundStore>

if (import.meta.hot) {
  import.meta.hot.on('template:update', (data: { filename: string, content: string }) => {
    // We can directly access the store since it should be instantiated
    const playground = usePlaygroundStore()
    const file = playground.files.get(data.filename)
    if (file) {
      file.write(data.content)
      // We mutate a bogus property or trigger a change so observers can react
      // The VirtualFile class could have an event emitter, but since it doesn't,
      // we'll trigger an event on the window just in case any component wants to forcefully refresh.
      if (import.meta.client) {
        window.dispatchEvent(new CustomEvent('template-file-updated', { detail: data.filename }))
      }
    }
  })
}
