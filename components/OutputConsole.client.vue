<script setup lang="ts">
import type { LogPayload } from '../types/console-output'
import { nextTick, onMounted, ref, useTemplateRef, watch } from 'vue'

// Lazy-load these only on client
let LunaConsole: any = null
let toEl: any = null

const lunaRef = useTemplateRef('luna-ref')
const lunaConsole = ref<any>()
const colorMode = useColorMode()
const theme = computed(() => colorMode.preference === 'dark' ? 'dark' : 'light')

// Load dependencies asynchronously on mount
const dependenciesReady = ref(false)

onMounted(async () => {
  // Load Luna Console and styles dynamically
  if (!LunaConsole) {
    const [lunaModule, styleObj, styleDom, styleGrid] = await Promise.all([
      import('luna-console'),
      import('luna-object-viewer/luna-object-viewer.css'),
      import('luna-dom-viewer/luna-dom-viewer.css'),
      import('luna-data-grid/luna-data-grid.css'),
    ])
    LunaConsole = lunaModule.default
  }

  // Load licia/toEl
  if (!toEl) {
    const licia = await import('licia/toEl')
    toEl = licia.default
  }

  // Import Luna Console CSS
  await import('luna-console/luna-console.css')

  dependenciesReady.value = true

  if (!lunaRef.value)
    return

  lunaConsole.value = new LunaConsole(lunaRef.value, {
    theme: theme.value,
  })

  // Make executeLog available globally for iframe communication
  if (typeof window !== 'undefined') {
    (window as any).executeLog = ({ logLevel, data = [] }: LogPayload) => {
      const deserialized = data.map(deserializeMessage)

      // Log to LunaConsole
      if (lunaConsole.value && deserialized.length > 0) {
        const logMethod = lunaConsole.value[logLevel]
        if (typeof logMethod === 'function') {
          logMethod.apply(lunaConsole.value, deserialized)
        }
      }

      // Also log to browser console
      const consoleMethod = console[logLevel as keyof typeof console]
      if (typeof consoleMethod === 'function') {
        consoleMethod.apply(console, deserialized)
      }
    }
  }
})

// Watch for theme changes and update LunaConsole theme reactively
watch(
  () => theme.value,
  (newTheme) => {
    if (lunaConsole.value && dependenciesReady.value) {
      lunaConsole.value.setOption('theme', newTheme)
      // Update theme class on root and sub-viewers
      updateLunaThemeClass(newTheme)
    }
  },
  { immediate: true },
)

async function updateLunaThemeClass(theme: string) {
  // Helper to update theme classes
  function applyTheme() {
    const root = lunaRef.value
    if (!root)
      return
    root.classList.remove('luna-console-theme-dark', 'luna-console-theme-light')
    root.classList.add(`luna-console-theme-${theme}`)

    const viewerTypes = ['object-viewer', 'dom-viewer', 'data-grid']
    for (const type of viewerTypes) {
      // Update theme class on all theme-marked elements
      const themeEls = root.querySelectorAll(`[class*="luna-${type}-theme-"]`)
      themeEls.forEach((el) => {
        el.classList.remove(`luna-${type}-theme-dark`, `luna-${type}-theme-light`)
        el.classList.add(`luna-${type}-theme-${theme}`)
      })
    }
  }
  // Run immediately
  applyTheme()
  // Run again after DOM updates using Vue's nextTick
  await nextTick()
  applyTheme()
}

function clearLunaConsole() {
  lunaConsole.value?.clear(true)
}

// Rest of your deserializeMessage function stays the same...

// maybe make this configurable, but don't do it by default
// watch(() => store.value.activeFile.code, clearLunaConsole)

/**
 * Lossless deserialization:
 * - Recreates primitives as-is
 * - Returns enriched objects for complex types (with __type metadata)
 * - Keeps outerHTML, function source, accessor info, etc.
 */
function deserializeMessage(arg: any): any {
  if (arg === null || arg === undefined)
    return arg
  if (typeof arg !== 'object' || !arg.__type)
    return arg

  switch (arg.__type) {
    case 'undefined':
      return undefined

    case 'function': {
      // Approximated with a Function constructor (non-invocable stub)
      const fn = new Function(`/* [Function ${arg.name}] */`)
        ; (fn as any).__isStub = true
      ; (fn as any).__preview = `[Function ${arg.name}]${arg.isNative ? ' [native]' : ''}`
      return fn
    }

    case 'symbol':
      return Symbol(arg.description ?? '')

    case 'bigint':
      try {
        return BigInt(arg.value)
      }
      catch {
        return new Object(`BigInt(${arg.value})`) // fallback object wrapper
      }

    case 'date':
      return arg.invalid ? new Date('Invalid Date') : new Date(arg.value).toString()

    case 'regexp':
      return new RegExp(arg.source, arg.flags)

    case 'error': {
      const e = new Error(arg.message)
      e.name = arg.name
      ; (e as any).stack = arg.stack
      return e
    }

    case 'dom': {
      if (arg.outerHTML && toEl) {
        const el = toEl(arg.outerHTML)
        Object.defineProperty(el, '__preview', {
          value: arg.outerHTML.replace(/\n/g, ''), // one-liner preview
          enumerable: false,
        })
        return el
      }
      if (arg.nodeType === 3 && arg.textContent) {
        return document.createTextNode(arg.textContent)
      }
      return `[DOM ${arg.tagName || 'Unknown'}]`
    }

    case 'vue_component':
      return `[VueComponent ${arg.name}]`

    case 'array': {
      const items = arg.items?.map(deserializeMessage) ?? []
      if (arg.truncated) {
        items.push(`...and ${arg.truncated} more items`)
      }
      return items
    }

    case 'object': {
      const out: Record<string, any> = {}
      for (const key in arg.properties) {
        const prop = arg.properties[key]
        if (prop && 'value' in prop) {
          out[key] = deserializeMessage(prop.value)
        }
      }
      if (arg.truncatedProperties) {
        out.__truncated__ = `${arg.truncatedProperties} more properties`
      }
      // Method, not property
      Object.defineProperty(out, 'toString', {
        value: () => `[Object ${arg.constructor}]`,
        enumerable: false,
      })
      return out
    }

    case 'circular':
      return `[Circular ${arg.path ?? ''}]`

    case 'accessor':
      return `[Getter/Setter]`

    default:
      return `[Unrecognized ${arg.__type}]`
  }
}
</script>

<template>
  <div class="console-wrapper">
    <div class="console-title">
      <strong>{{ $t('console-output.name') }}</strong>
      <button class="clear-btn" @click="clearLunaConsole">
        {{ $t('console-output.clear') }}
      </button>
    </div>
    <div class="luna-container">
      <div ref="luna-ref" />
    </div>
  </div>
</template>

<style scoped>
.console-wrapper {
  height: 100%;
  border-left: 1px solid var(--border);
}

.luna-container {
  height: calc(100% - var(--header-height));
  width: 100%;
  overflow: auto;
}

.luna-console-theme-dark {
  background-color: var(--bg) !important;
}

.console-title {
  height: var(--header-height);
  position: sticky;
  top: 0;
  border-bottom: 1px solid var(--border);
  background-color: var(--bg);
  padding-left: 10px;
  color: var(--text-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.clear-btn {
  font-size: 0.85rem;
  font-family: var(--font-code);
  color: var(--text-light);
  padding: 0.3rem;
  margin: 0.2rem;
  background-color: var(--bg);
  border-radius: 4px;
  border: 1px solid var(--border);
}

.clear-btn:hover {
  color: var(--color-branding);
}
</style>
