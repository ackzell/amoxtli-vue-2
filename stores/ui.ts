import type { CodePanelId, LayoutNode, LayoutSplit } from '~/types/layout'

export type MainViewMode = 'split' | 'code' | 'docs'
export type MainLayoutOrientation = 'horizontal' | 'vertical'
export type MobilePanelView = 'docs' | 'code'

const DEFAULT_LAYOUT_TREE: LayoutSplit = {
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

function getDefaultLayoutTree(): LayoutSplit {
  return toPlain(DEFAULT_LAYOUT_TREE)
}

function normalizeLayoutTree(tree: unknown): LayoutSplit {
  const fresh = () => getDefaultLayoutTree()
  const validIds = new Set<CodePanelId>(['editor', 'preview', 'console', 'terminal'])
  const seen = new Set<CodePanelId>()
  let splitCount = 0

  function nextSplitId() {
    splitCount += 1
    return `split-${splitCount}`
  }

  function normalizeNode(node: unknown): LayoutNode | null {
    if (!node || typeof node !== 'object')
      return null

    const n = node as Record<string, unknown>

    if (n.type === 'panel') {
      const id = n.id as CodePanelId
      if (!validIds.has(id) || seen.has(id))
        return null
      seen.add(id)
      return { type: 'panel', id }
    }

    if (n.type === 'split') {
      const direction = n.direction
      if (direction !== 'horizontal' && direction !== 'vertical')
        return null

      const childrenRaw = Array.isArray(n.children) ? n.children : []
      const children = childrenRaw
        .map(normalizeNode)
        .filter((child): child is LayoutNode => child !== null)

      if (children.length === 0)
        return null
      if (children.length === 1)
        return children[0] ?? null

      const id = typeof n.id === 'string' && n.id.length > 0 ? n.id : nextSplitId()
      return {
        type: 'split',
        id,
        direction,
        children,
      }
    }

    return null
  }

  const rootNode = normalizeNode(tree)
  const root = rootNode?.type === 'split' ? rootNode : fresh()

  for (const id of validIds) {
    if (!seen.has(id))
      root.children.push({ type: 'panel', id })
  }

  if (root.children.length === 1) {
    root.children.push({ type: 'panel', id: 'editor' })
  }

  return root
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
  persistState.layoutTree = toPlain(normalizeLayoutTree(persistState.layoutTree))
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
