import type { LayoutSplit } from '@calmecac-vue/playground-layout'
import { normalizeLayoutTree } from '@calmecac-vue/playground-layout'

export type MainViewMode = 'split' | 'code' | 'docs'
export type MainLayoutOrientation = 'horizontal' | 'vertical'
export type MobilePanelView = 'docs' | 'code'

/** Panel ids declared by this app (the shared dock stays generic). */
export type CodePanelId = 'editor' | 'preview' | 'console' | 'terminal'
export const CODE_PANEL_IDS: readonly CodePanelId[] = ['editor', 'preview', 'console', 'terminal']

const DEFAULT_LAYOUT_TREE: LayoutSplit<CodePanelId> = {
  type: 'split',
  id: 'split-1',
  direction: 'vertical',
  children: [
    { type: 'panel', id: 'editor' },
    { type: 'panel', id: 'preview' },
    { type: 'panel', id: 'console' },
    { type: 'panel', id: 'terminal' },
  ],
}

function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function getDefaultLayoutTree(): LayoutSplit<CodePanelId> {
  return toPlain(DEFAULT_LAYOUT_TREE)
}

export const useUiState = defineStore('ui', () => {
  const isPanelDragging = ref(false)
  const isContentDropdownShown = ref(false)
  const mobilePanelView = ref<MobilePanelView>('docs')
  // true when mainViewMode was set from the desktop nav (not the mobile toggle)
  const mainViewModeFromDesktop = ref(false)

  const persistState = reactive(getLayoutDefaults())

  function getLayoutDefaults() {
    return {
      panelDocs: 40,
      panelFileTree: 0,
      showTerminal: true,
      showConsole: true,
      showPreview: true,
      mainViewMode: 'split' as MainViewMode,
      mainLayoutOrientation: 'horizontal' as MainLayoutOrientation,
      mainLayoutReverse: false,
      layoutTree: getDefaultLayoutTree(),
      isSnapshotSidebarOpen: false,
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
  const cookieState = toPlain(stateCookie.value || {})
  Object.assign(persistState, getLayoutDefaults(), cookieState)
  persistState.layoutTree = normalizeLayoutTree(persistState.layoutTree, CODE_PANEL_IDS)
  watch(persistState, () => {
    stateCookie.value = toPlain({ ...persistState })
  })

  function toggleTerminal() {
    persistState.showTerminal = !persistState.showTerminal
  }

  function toggleConsole() {
    persistState.showConsole = !persistState.showConsole
  }

  function togglePreview() {
    persistState.showPreview = !persistState.showPreview
  }

  function setMainViewMode(mode: MainViewMode) {
    persistState.mainViewMode = mode
  }

  function setMainViewModeFromDesktop(mode: MainViewMode) {
    mainViewModeFromDesktop.value = true
    persistState.mainViewMode = mode
  }

  function setMainLayoutOrientation(orientation: MainLayoutOrientation) {
    persistState.mainLayoutOrientation = orientation
  }

  function toggleMainLayoutOrientation() {
    persistState.mainLayoutOrientation = persistState.mainLayoutOrientation === 'horizontal'
      ? 'vertical'
      : 'horizontal'
  }

  function toggleMainLayoutReverse() {
    persistState.mainLayoutReverse = !persistState.mainLayoutReverse
  }

  function toggleSnapshotSidebar() {
    persistState.isSnapshotSidebarOpen = !persistState.isSnapshotSidebarOpen
  }

  function setMobilePanelView(panel: MobilePanelView) {
    mobilePanelView.value = panel
  }

  return {
    isPanelDragging,
    isContentDropdownShown,
    mobilePanelView,
    mainViewModeFromDesktop,
    toggleTerminal,
    toggleConsole,
    togglePreview,
    setMainViewMode,
    setMainViewModeFromDesktop,
    setMainLayoutOrientation,
    toggleMainLayoutOrientation,
    toggleMainLayoutReverse,
    resetLayout,
    ...toRefs(persistState),

    toggleSnapshotSidebar,
    setMobilePanelView,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useUiState, import.meta.hot))
