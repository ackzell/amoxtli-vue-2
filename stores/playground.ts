import type { DirEnt, WebContainer, WebContainerProcess } from 'almostnode/webcontainer'
import type { Raw } from 'vue'
import type { TemplateType } from '~/types/guides'
import { filesToWebContainerFs } from '~/templates/utils'
import { TEMPLATE_TYPES } from '~/types/guides'
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

/**
 * Enable almostnode / container debugging by setting
 * `window.__almostnodeDebug = true` in the browser console before
 * triggering a playground mount. All diagnostic logs are gated behind this.
 */
function isDebugEnabled(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__almostnodeDebug
}

/**
 * almostnode's runtime evaluates ESM as CJS inside a synchronous wrapper, so a
 * top-level `await` in a module body is a SyntaxError. Vite's `bin/vite.js`
 * contains exactly one top-level `await import('node:inspector')` (its `--profile`
 * support block), which prevents the real Vite CLI from booting. Neutralize that
 * line in the container so `pnpm run dev` can start the dev server.
 */
async function patchViteBinForAlmostnode(wc: WebContainer) {
  const binPath = 'node_modules/vite/bin/vite.js'
  try {
    const bin = await wc.fs.readFile(binPath, 'utf-8') as string
    const patched = bin.replace(
      /await import\(['"]node:inspector['"]\)\.then\(\(r\) => r\.default\)/g,
      'null',
    )
    if (patched !== bin)
      await wc.fs.writeFile(binPath, patched, 'utf-8')
  }
  catch {
    // vite not installed (e.g. html template) — nothing to patch
  }
}

/**
 * TEMPORARY DEBUG: Print which vite was actually installed in the container
 * (version + chunk.js shape) to the browser console and the xterm panel.
 */
async function logViteDiagnostics(wc: WebContainer) {
  if (!isDebugEnabled())
    return
  const lines: string[] = []
  let version: string | undefined

  try {
    const pkg = JSON.parse(await wc.fs.readFile('node_modules/vite/package.json', 'utf-8') as string)
    version = pkg.version
    lines.push(`[vite-diag] vite version: ${version}`)
  }
  catch (err) {
    lines.push(`[vite-diag] no vite in node_modules (html template?): ${err instanceof Error ? err.message : err}`)
  }

  if (version) {
    try {
      const chunk = await wc.fs.readFile('node_modules/vite/dist/node/chunks/chunk.js', 'utf-8') as string
      lines.push(`[vite-diag] chunk.js length: ${chunk.length}`)
      lines.push(`[vite-diag] chunk.js lines: ${chunk.split('\n').length}`)
      lines.push('[vite-diag] chunk.js first 600 chars:')
      lines.push(chunk.slice(0, 600))
    }
    catch (err) {
      lines.push(`[vite-diag] chunk.js MISSING — vite build doesn't use chunks/chunk.js (5.x dep-*.js layout?): ${err instanceof Error ? err.message : err}`)
      try {
        const entries = await wc.fs.readdir('node_modules/vite/dist/node/chunks', { withFileTypes: true }) as DirEnt[]
        lines.push(`[vite-diag] chunks dir entries: ${entries.map(e => e.name).join(', ')}`)
      }
      catch {
        lines.push('[vite-diag] could not list chunks dir')
      }
    }
  }

  const text = lines.join('\n')
  // eslint-disable-next-line no-console
  console.log(text)
  if (import.meta.client)
    window.dispatchEvent(new CustomEvent<string>('amoxtli:vite-diag', { detail: text }))
}

/**
 * TEMPORARY DEBUG: Confirm vite's bin was skipped (still untransformed ESM with
 * top-level await) by printing its first few lines.
 */
async function logViteBinHead(wc: WebContainer) {
  if (!isDebugEnabled())
    return
  try {
    const bin = await wc.fs.readFile('node_modules/vite/bin/vite.js', 'utf-8') as string
    const head = bin.split('\n').slice(0, 5).join('\n')
    const text = `[vite-bin]\n${head}`
    // eslint-disable-next-line no-console
    console.log(text)
    if (import.meta.client)
      window.dispatchEvent(new CustomEvent<string>('amoxtli:vite-diag', { detail: text }))
  }
  catch (err) {
    console.error('[vite-bin] failed to read vite/bin/vite.js', err)
  }
}

/**
 * TEMPORARY DEBUG: Write `filename` into the container, run it via `node`,
 * and report its output to the browser console and the xterm panel.
 */
async function runNodeDiagnostic(wc: WebContainer, filename: string, script: string, label: string) {
  if (!isDebugEnabled())
    return
  try {
    await wc.fs.writeFile(filename, script, 'utf-8')
  }
  catch (err) {
    console.error(`[${label}] failed to write ${filename}`, err)
    return
  }

  try {
    const process = await wc.spawn('node', [filename])
    const reader = process.output.getReader()
    let output = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done)
        break
      output += value
    }
    await process.exit

    const text = `[${label}]\n${output.trim()}`
    // eslint-disable-next-line no-console
    console.log(text)
    if (import.meta.client)
      window.dispatchEvent(new CustomEvent<string>('amoxtli:vite-diag', { detail: text }))
  }
  catch (err) {
    console.error(`[${label}] failed to run node ${filename}`, err)
  }
}

/**
 * TEMPORARY DEBUG: Inspect the runtime's `node:module` shim for a working
 * `createRequire`.
 */
async function logModuleDiagnostics(wc: WebContainer) {
  if (!isDebugEnabled())
    return
  const script = [
    'const m = require(\'node:module\');',
    'console.log(\'DEBUG typeof createRequire:\', typeof m.createRequire);',
    'console.log(\'DEBUG keys:\', JSON.stringify(Object.keys(m)));',
    'console.log(\'DEBUG own prop:\', Object.prototype.hasOwnProperty.call(m, \'createRequire\'));',
  ].join('\n')
  await runNodeDiagnostic(wc, 'debug.js', script, 'module-diag')
}

/**
 * TEMPORARY DEBUG: Does `require('vite')` reproduce the failure, and does the
 * state of `node:module` change afterwards?
 */
async function logModuleDiagnostics2(wc: WebContainer) {
  if (!isDebugEnabled())
    return
  const script = [
    'console.log(\'A typeof:\', typeof require(\'node:module\').createRequire);',
    'try {',
    '  const vite = require(\'vite\');',
    '  console.log(\'B vite loaded, createServer:\', typeof vite.createServer);',
    '} catch (e) {',
    '  console.log(\'C vite FAILED:\', e.message);',
    '  console.log(\'C top of stack:\', e.stack.split(\'\\n\').slice(0, 3).join(\' | \'));',
    '}',
    'console.log(\'D typeof:\', typeof require(\'node:module\').createRequire);',
    'console.log(\'D keys:\', JSON.stringify(Object.keys(require(\'node:module\'))));',
  ].join('\n')
  await runNodeDiagnostic(wc, 'debug2.js', script, 'module-diag2')
}

/**
 * TEMPORARY DEBUG: HMR bridge probes — check if almostnode's Vite HMR bridge
 * is wired inside the container (createServer wrapped + ws shim present).
 */
async function logHmrBridgeDiagnostics(wc: WebContainer) {
  if (!isDebugEnabled())
    return
  // Probe 2: is createServer wrapped by almostnode-vite-hmr-bridge?
  const probe2 = [
    'try {',
    '  const v = require(\'vite\');',
    '  const name = v.createServer?.name || \'unnamed\';',
    '  const body = v.createServer?.toString()?.slice(0, 500) || \'\';',
    '  const wrapped = body.includes(\'almostnode-vite-hmr-bridge\');',
    '  console.log(\'PROBE2 createServer.name:\', name);',
    '  console.log(\'PROBE2 WRAPPED:\', wrapped);',
    '  console.log(\'PROBE2 body_head:\', body.slice(0, 300));',
    '} catch(e) {',
    '  console.log(\'PROBE2 ERROR:\', e.message);',
    '}',
  ].join('\n')
  await runNodeDiagnostic(wc, 'probe2.js', probe2, 'hmr-bridge-probe2')

  // Probe 3: is the ws shim's _setupHmrBridge present?
  const probe3 = [
    'try {',
    '  const WS = require(\'ws\').WebSocketServer;',
    '  const hasBridge = !!WS.prototype._setupHmrBridge;',
    '  const keys = Object.getOwnPropertyNames(WS.prototype).join(\', \');',
    '  console.log(\'PROBE3 SOCKET_BRIDGE:\', hasBridge);',
    '  console.log(\'PROBE3 WS.prototype keys:\', keys);',
    '} catch(e) {',
    '  console.log(\'PROBE3 ws ERROR:\', e.message);',
    '}',
  ].join('\n')
  await runNodeDiagnostic(wc, 'probe3.js', probe3, 'hmr-bridge-probe3')
}

/**
 * TEMPORARY DEBUG: Check if BroadcastChannel('vite-hmr-bridge') is reachable
 * from the parent page. Answers whether cross-frame transport can work.
 */
function logBroadcastChannelProbe() {
  if (!import.meta.client || !isDebugEnabled())
    return
  try {
    const bc = new BroadcastChannel('vite-hmr-bridge-test')
    bc.postMessage({ probe: true, ts: Date.now() })
    bc.close()
    const msg = '[HMR-DIAG] BroadcastChannel OK from parent page'
    console.warn(msg)
    window.dispatchEvent(new CustomEvent<string>('amoxtli:vite-diag', { detail: msg }))
  }
  catch (e) {
    const msg = `[HMR-DIAG] BroadcastChannel FAIL from parent page: ${e instanceof Error ? e.message : e}`
    console.error(msg)
    window.dispatchEvent(new CustomEvent<string>('amoxtli:vite-diag', { detail: msg }))
  }
}

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

  /**
   * Creates a map of templates with empty file objects, to be filled later.
   * @param keys
   * @returns A record mapping each key to an empty file object.
   * @example { vue: {}, html: {}, 'vue-sass': {} }
   */
  function createTemplateMap<T>(
    keys: readonly T[],
  ): Record<T & PropertyKey, Record<string, string>> {
    return Object.fromEntries(
      keys.map(key => [key, {}]),
    ) as Record<T & PropertyKey, Record<string, string>>
  }

  let templatesMap = createTemplateMap(TEMPLATE_TYPES)
  const files = shallowReactive<Raw<Map<string, VirtualFile>>>(new Map())
  const fileSelected = shallowRef<Raw<VirtualFile>>()

  const fileContentVersion = ref(0)
  function notifyFileChanged() {
    fileContentVersion.value++
  }

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

    const [wc, loadedTemplates] = await Promise.all([
      import('almostnode/webcontainer')
        .then(({ WebContainer }) => WebContainer.boot()),

      Promise.all(
        TEMPLATE_TYPES.map(async (type) => {
          const template = await import('../templates')
            .then(r => r.templates[type]())

          return [type, template] as const
        }),
      ),
    ])

    templatesMap = Object.fromEntries(loadedTemplates) as typeof templatesMap

    webcontainer.value = wc

    if (import.meta.client && isDebugEnabled()) {
      (window as any).__viteDiag = async () => {
        await logViteDiagnostics(wc)
        await logViteBinHead(wc)
        await logModuleDiagnostics(wc)
        await logModuleDiagnostics2(wc)
        await logHmrBridgeDiagnostics(wc)
        logBroadcastChannelProbe()
      }
      logBroadcastChannelProbe()
    }

    const defaultTemplate = templatesMap.html

    Object.entries(defaultTemplate)

    wc.on('server-ready', async (port, url) => {
      // Dev server might listen on multiple ports, we need the main one
      if (port === DEV_SERVER_PORT) {
        preview.location = {
          origin: url,
          fullPath: preview.pendingFullPath,
        }
        preview.updateUrl()
        status.value = 'ready'
        // Fire-and-forget: run HMR bridge probes after server is ready
        logHmrBridgeDiagnostics(wc).catch(() => {})
      }
    })

    wc.on('error', (err) => {
      error.value = err
      status.value = 'error'
    })

    status.value = 'mount'
    await wc.mount(filesToWebContainerFs([...files.values()]))

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
          await logViteDiagnostics(wc)
          await logViteBinHead(wc)
          await logModuleDiagnostics(wc)
          await logModuleDiagnostics2(wc)
          await logHmrBridgeDiagnostics(wc)
          logBroadcastChannelProbe()
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
    // almostnode can't execute vite's bin as-is (top-level await), so patch it
    await patchViteBinForAlmostnode(wc)
    await logViteDiagnostics(wc)
    await logViteBinHead(wc)
    await logModuleDiagnostics(wc)
    await logModuleDiagnostics2(wc)
    await logHmrBridgeDiagnostics(wc)
    logBroadcastChannelProbe()
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

    const devExitCode = await spawn(wc, 'pnpm', args)
    if (devExitCode !== 0) {
      console.error(`[playground] Dev server exited with code ${devExitCode}`)
    }
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
      if (file.read() !== content) {
        await file.write(content)
        notifyFileChanged()
      }
      return file
    }
    else {
      const newFile = new VirtualFile(filepath, content, webcontainer.value!)
      if (filepath.endsWith('.html'))
        newFile.fsTransform = injectHtmlScripts
      files.set(filepath, newFile)
      await newFile.write(content)
      notifyFileChanged()
      return newFile
    }
  }

  /**
   * Mount files to WebContainer.
   * This will do a diff with the current files and only update the ones that changed.
   * If package.json changed, triggers a reinstall + server restart.
   */
  async function mount(map: Record<string, string>, templateName: TemplateType = 'vue') {
    // console.warn(`[playgroundStore.mount] Mounting files with template ${templateName}:`, map)

    const templates = templatesMap[templateName]
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
    if (depsChanged || !hasInstalled) {
      startServer()
    }
  }

  // Computed properties that return safe values when not initialized
  const safeStatus = computed(() => _isInitialized.value ? status.value : 'init')
  const safeWebcontainer = computed(() => _isInitialized.value ? webcontainer.value : null)
  const safeError = computed(() => _isInitialized.value ? error.value : undefined)
  const safeCurrentProcess = computed(() => _isInitialized.value ? currentProcess.value : undefined)

  /**
   * Mount files to WebContainer without template merging.
   * Used by snapshot restore to write exactly the saved files.
   */
  async function mountFiles(fileMap: Record<string, string>) {
    const newPackageJson = fileMap['package.json'] || ''
    const depsChanged = hasInstalled && newPackageJson !== lastInstalledPackageJson

    if (depsChanged) {
      killPreviousProcess()
      hasInstalled = false
      preview.url = ''
      status.value = 'mount'
    }

    const toRemove = Array.from(files.keys()).filter(fp => !(fp in fileMap))

    await Promise.all([
      ...Object.entries(fileMap).map(async ([filepath, content]) => {
        await _updateOrCreateFile(filepath, content)
      }),
      ...toRemove.map(async (filepath) => {
        const file = files.get(filepath)
        await file?.remove()
        files.delete(filepath)
      }),
    ])

    if (depsChanged || !hasInstalled) {
      startServer()
    }
  }

  return {
    init,
    webcontainer: safeWebcontainer,
    status: safeStatus,
    error: safeError,
    currentProcess: safeCurrentProcess,

    restartServer: startServer,

    files,
    fileContentVersion,
    fileSelected,
    notifyFileChanged,
    mount,
    mountFiles,
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
      playground.notifyFileChanged()
      if (import.meta.client) {
        window.dispatchEvent(new CustomEvent('template-file-updated', { detail: data.filename }))
      }
    }
  })
}
