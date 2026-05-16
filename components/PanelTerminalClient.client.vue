<script lang="ts">
import type { ITheme } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import themeDark from 'theme-vitesse/extra/xterm-vitesse-dark.json'
import themeLight from 'theme-vitesse/extra/xterm-vitesse-light.json'
import '@xterm/xterm/css/xterm.css'

let globalTerminal: Terminal | undefined
let globalFitAddon: FitAddon | undefined
let currentProcess: any
let currentReader: any
let onDataDisposable: { dispose: () => void } | undefined
let init = false
</script>

<script setup lang="ts">
const colorMode = useColorMode()
const theme = computed<ITheme>(() => {
  return colorMode.value === 'dark'
    ? {
        ...themeDark,
        background: '#00000000',
      }
    : {
        ...themeLight,
        background: '#00000000',
      }
})

const root = ref<HTMLDivElement>()

if (!globalTerminal) {
  globalTerminal = new Terminal({
    customGlyphs: true,
    allowTransparency: true,
    theme: theme.value,
    fontFamily: 'DM Mono, monospace',
  })
  globalFitAddon = new FitAddon()
  globalTerminal.loadAddon(globalFitAddon)
}

// persist the scroll position of terminal
const ui = useUiState()
watch(() => ui.showTerminal, (v) => {
  if (!root.value)
    return
  if (!v) {
    const { height } = root.value.getBoundingClientRect()
    root.value.style.height = `${height}px`
  }
  else {
    root.value.style.height = 'initial'
  }
}, { flush: 'sync' })

watch(
  () => theme.value,
  (t) => {
    if (globalTerminal) {
      globalTerminal.options.theme = t
    }
  },
)

watch(
  () => {
    // Prevent playground store access in docs mode
    if (ui.mainViewMode === 'docs')
      return undefined

    // We conditionally access the store
    const play = usePlaygroundStore()
    return play.currentProcess
  },
  (p) => {
    if (currentProcess === p) {
      return // Already bound to this process
    }

    currentProcess = p

    if (onDataDisposable) {
      onDataDisposable.dispose()
      onDataDisposable = undefined
    }

    if (currentReader) {
      currentReader.cancel().catch(() => {})
      currentReader = undefined
    }

    if (!p || !globalTerminal)
      return

    // Output
    try {
      currentReader = p.output.getReader()
      const readerToUse = currentReader
      function read() {
        readerToUse.read().then(({ done, value }) => {
          if (value && globalTerminal) {
            globalTerminal.write(value)
            globalTerminal.scrollToBottom()
          }
          if (!done && currentReader === readerToUse)
            read()
        })
      }

      if (!init) {
        init = true
      }
      else {
        globalTerminal.writeln('')
        globalTerminal.writeln(`-------------`)
        globalTerminal.writeln('')
        globalTerminal.scrollToBottom()
      }

      read()
    }
    catch (e) {
      console.error(e)
    }

    try {
      const writer = p.input.getWriter()
      onDataDisposable = globalTerminal.onData((data) => {
        try {
          writer.write(data)
        }
        catch (e) {
          console.error(e)
        }
      })
    }
    catch (e) {
      console.error(e)
    }
  },
  { flush: 'sync', immediate: true },
)

useResizeObserver(root, useDebounceFn(() => {
  if (globalFitAddon) {
    globalFitAddon.fit()
  }
}, 200))

const stop = watch(
  () => root.value,
  (el) => {
    if (!el || !globalTerminal || !globalFitAddon)
      return

    if (globalTerminal.element) {
      el.appendChild(globalTerminal.element)
      globalFitAddon.fit()
    }
    else {
      globalTerminal.open(el)
      globalTerminal.write('\n')
      globalFitAddon.fit()
    }
    stop()
  },
  { immediate: true },
)
</script>

<template>
  <div ref="root" h-full w-full of-hidden />
</template>
