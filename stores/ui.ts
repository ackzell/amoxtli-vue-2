export const useUiState = defineStore('ui', () => {
  const isPanelDragging = ref(false)
  const isContentDropdownShown = ref(false)

  const persistState = reactive(getLayoutDefaults())

  function getLayoutDefaults() {
    return {
      panelDocs: 40,
      panelEditor: 50,
      panelPreview: 30,
      panelConsole: 20,
      panelFileTree: 0,
      showTerminal: true,
      showConsole: true,
    }
  }

  function resetLayout() {
    Object.assign(persistState, getLayoutDefaults())
  }

  const stateCookie = useCookie<Partial<typeof persistState>>(
    'nuxt-playground-ui-state',
    { default: () => (getLayoutDefaults()), watch: true },
  )

  // update and sync cookie with the reactive state
  Object.assign(persistState, getLayoutDefaults(), { ...stateCookie.value })
  watch(persistState, () => {
    stateCookie.value = { ...persistState }
  })

  function toggleTerminal() {
    const TERMINAL_HEIGHT = 20
    persistState.showTerminal = !persistState.showTerminal
    if (persistState.showTerminal) {
      persistState.panelEditor = persistState.panelEditor / 100 * (100 - TERMINAL_HEIGHT)
      persistState.panelPreview = persistState.panelPreview / 100 * (100 - TERMINAL_HEIGHT)
    }
    else {
      const remaining = persistState.panelEditor + persistState.panelPreview
      persistState.panelEditor = persistState.panelEditor / remaining * 100
      persistState.panelPreview = persistState.panelPreview / remaining * 100
    }
  }

  function toggleConsole() {
    const CONSOLE_HEIGHT = 20
    persistState.showConsole = !persistState.showConsole
    if (persistState.showConsole) {
      persistState.panelEditor = persistState.panelEditor / 100 * (100 - CONSOLE_HEIGHT)
      persistState.panelPreview = persistState.panelPreview / 100 * (100 - CONSOLE_HEIGHT)
    }
    else {
      const remaining = persistState.panelEditor + persistState.panelPreview
      persistState.panelEditor = persistState.panelEditor / remaining * 100
      persistState.panelPreview = persistState.panelPreview / remaining * 100
    }
  }

  return {
    isPanelDragging,
    isContentDropdownShown,
    toggleTerminal,
    toggleConsole,
    resetLayout,
    ...toRefs(persistState),
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useUiState, import.meta.hot))
