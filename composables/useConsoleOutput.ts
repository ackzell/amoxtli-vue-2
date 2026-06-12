import { computed, nextTick, watch } from 'vue'

export function useConsoleOutput(options?: { withDomReconstruction?: boolean }) {
  const colorMode = useColorMode()
  const theme = computed(() => colorMode.value === 'dark' ? 'dark' : 'light')

  let lunaInstance: any = null
  let toEl: any = null
  let containerEl: HTMLElement | null = null
  let disposeThemeWatch: (() => void) | null = null
  let deserializeMessage: (arg: any) => any = (arg: any) => arg

  async function initConsole(el: HTMLElement) {
    containerEl = el

    const promises: Promise<any>[] = [
      import('luna-console'),
      import('luna-console/luna-console.css'),
    ]

    if (options?.withDomReconstruction) {
      promises.push(
        import('luna-object-viewer/luna-object-viewer.css'),
        import('luna-dom-viewer/luna-dom-viewer.css'),
        import('luna-data-grid/luna-data-grid.css'),
        import('licia/toEl'),
      )
    }

    const results = await Promise.all(promises)
    const LunaConsole = results[0].default

    if (options?.withDomReconstruction) {
      const liciaModule = results[results.length - 1]
      toEl = liciaModule.default
    }

    const deserializer = useConsoleDeserializer(toEl)
    deserializeMessage = deserializer.deserializeMessage

    lunaInstance = new LunaConsole(containerEl, {
      theme: theme.value,
    })

    if (options?.withDomReconstruction) {
      await nextTick()
      updateLunaThemeClass(theme.value)
    }

    disposeThemeWatch = watch(() => colorMode.value, (mode) => {
      if (!lunaInstance)
        return
      const newTheme = mode === 'dark' ? 'dark' : 'light'
      lunaInstance.setOption('theme', newTheme)
      if (options?.withDomReconstruction) {
        updateLunaThemeClass(newTheme)
      }
    })
  }

  function addLog(logLevel: string, data: any[]) {
    const deserialized = data.map(deserializeMessage)
    if (lunaInstance && deserialized.length > 0) {
      const logMethod = lunaInstance[logLevel]
      if (typeof logMethod === 'function')
        logMethod.apply(lunaInstance, deserialized)
    }
  }

  function clearLogs(preserveHistory = false) {
    lunaInstance?.clear(preserveHistory)
  }

  function destroy() {
    if (disposeThemeWatch) {
      disposeThemeWatch()
      disposeThemeWatch = null
    }
    lunaInstance = null
    containerEl = null
  }

  async function updateLunaThemeClass(newTheme: string) {
    function applyTheme() {
      const root = containerEl
      if (!root)
        return
      root.classList.remove('luna-console-theme-dark', 'luna-console-theme-light')
      root.classList.add(`luna-console-theme-${newTheme}`)

      const viewerTypes = ['object-viewer', 'dom-viewer', 'data-grid']
      for (const type of viewerTypes) {
        const themeEls = root.querySelectorAll(`[class*="luna-${type}-theme-"]`)
        themeEls.forEach((el) => {
          el.classList.remove(`luna-${type}-theme-dark`, `luna-${type}-theme-light`)
          el.classList.add(`luna-${type}-theme-${newTheme}`)
        })
      }
    }
    applyTheme()
    await nextTick()
    applyTheme()
  }

  return {
    initConsole,
    addLog,
    clearLogs,
    destroy,
    theme,
  }
}
