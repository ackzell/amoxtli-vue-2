import type { WebContainer, WebContainerProcess } from '@webcontainer/api'
import type { Raw } from 'vue'
import { filesToWebContainerFs } from '~/templates/utils'
import { VirtualFile } from '../structures/VirtualFile'

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
  const preview = usePreviewStore()

  const status = ref<PlaygroundStatus>('init')
  const error = shallowRef<{ message: string }>()
  const currentProcess = shallowRef<Raw<WebContainerProcess | undefined>>()
  const webcontainer = shallowRef<Raw<WebContainer>>()

  let filesTemplate: Record<string, string> = {}
  const files = shallowReactive<Raw<Map<string, VirtualFile>>>(new Map())
  const fileSelected = shallowRef<Raw<VirtualFile>>()

  const colorMode = useColorMode()
  let _promiseInit: Promise<void> | undefined
  let hasInstalled = false

  // Mount the playground on client side
  if (import.meta.client) {
    async function init() {
      const [
        wc,
        filesRaw,
      ] = await Promise.all([
        import('@webcontainer/api')
          .then(({ WebContainer }) => WebContainer.boot()),

        import('../templates')
          .then(r => r.templates.basic()),
      ])

      filesTemplate = filesRaw
      webcontainer.value = wc

      Object.entries(filesRaw)
        .forEach(([path, content]) => {
          files.set(path, new VirtualFile(path, content, wc))
        })

      wc.on('server-ready', async (port, url) => {
        // Dev server might listen on multiple ports, we need the main one
        if (port === DEV_SERVER_PORT) {
          preview.location = {
            origin: url,
            fullPath: '/',
          }
          status.value = 'polling'
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
    }

    _promiseInit = init()
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
    } else if (!hasInstalled) {
      // Check if node_modules already exists (smart install skip)
      try {
        const files = await wc.fs.readdir('node_modules')
        // If we can read at least a few files, node_modules is ready
        if (files && files.length > 0) {
          hasInstalled = true
          status.value = 'start'
        }
      } catch (e) {
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
    
    await spawn(wc, 'pnpm', args)
  }

  async function launchInteractiveProcess(wc: WebContainer, signal: AbortSignal) {
    if (signal.aborted)
      return
    status.value = 'interactive'
    await spawn(wc, 'jsh')
  }

  async function _updateOrCreateFile(filepath: string, content: string) {
    const file = files.get(filepath)
    if (file) {
      if (file.read() !== content)
        await file.write(content)
      return file
    }
    else {
      const newFile = new VirtualFile(filepath, content, webcontainer.value!)
      files.set(filepath, newFile)
      await newFile.write(content)
      return newFile
    }
  }

  /**
   * Mount files to WebContainer.
   * This will do a diff with the current files and only update the ones that changed
   */
  async function mount(map: Record<string, string>, templates = filesTemplate) {
    const objects = {
      ...templates,
      ...map,
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
  }

  return {
    get init() {
      return _promiseInit
    },

    webcontainer,
    status,
    error,
    currentProcess,

    restartServer: startServer,

    files,
    fileSelected,
    mount,
  }
})

export type PlaygroundStore = ReturnType<typeof usePlaygroundStore>

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(usePlaygroundStore, import.meta.hot))
