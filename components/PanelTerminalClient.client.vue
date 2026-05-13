<script setup lang="ts">
import type { ITheme } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import themeDark from 'theme-vitesse/extra/xterm-vitesse-dark.json'
import themeLight from 'theme-vitesse/extra/xterm-vitesse-light.json'
import '@xterm/xterm/css/xterm.css'

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
const terminal = new Terminal({
  customGlyphs: true,
  allowTransparency: true,
  theme: theme.value,
  fontFamily: 'DM Mono, monospace',
})

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
    terminal.options.theme = t
  },
)

const fitAddon = new FitAddon()
terminal.loadAddon(fitAddon)

// Terminal functionality disabled in docs mode to prevent playground store access

useResizeObserver(root, useDebounceFn(() => fitAddon.fit(), 200))

const stop = watch(
  () => root.value,
  (el) => {
    if (!el)
      return
    terminal.open(el)
    terminal.write('\n')
    fitAddon.fit()
    stop()
  },
)
</script>

<template>
  <div ref="root" h-full w-full of-hidden />
</template>
