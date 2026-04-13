import type { CodePanelId, LayoutSplit, LayoutNode, LayoutLeaf } from '~/types/layout'

export type MainViewMode = 'split' | 'code' | 'docs'
export type MainLayoutOrientation = 'horizontal' | 'vertical'

const DEFAULT_LAYOUT_TREE: LayoutSplit = {
  type: 'split',
  direction: 'vertical',
  children: [
    { type: 'panel', id: 'editor' },
    { type: 'panel', id: 'output' },
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
  if (!tree || typeof tree !== 'object') return fresh()
  const t = tree as Record<string, unknown>
  if (t.type !== 'split') return fresh()
  if (!['horizontal', 'vertical'].includes(t.direction as string)) return fresh()
  if (!Array.isArray(t.children)) return fresh()

  const validIds = new Set<CodePanelId>(['editor', 'output', 'terminal'])
  const seen = new Set<CodePanelId>()
  const children: LayoutNode[] = []

  for (const child of t.children) {
    if (child?.type === 'panel' && validIds.has(child.id) && !seen.has(child.id)) {
      children.push({ type: 'panel', id: child.id as CodePanelId })
      seen.add(child.id as CodePanelId)
    }
  }
  for (const id of validIds) {
    if (!seen.has(id))
      children.push({ type: 'panel', id })
  }

  return { type: 'split', direction: t.direction as 'horizontal' | 'vertical', children }
}

export const useUiState = defineStore('ui', () => {
  const isPanelDragging = ref(false)
  const isContentDropdownShown = ref(false)

  const persistState = reactive(getLayoutDefaults())

  function getLayoutDefaults() {
    return {
      panelDocs: 40,
      panelEditor: 50,
      panelOutput: 30,
      panelPreview: 60,
      panelFileTree: 0,
      showTerminal: true,
      showConsole: true,
      showPreview: true,
      mainViewMode: 'split' as MainViewMode,
      mainLayoutOrientation: 'horizontal' as MainLayoutOrientation,
      mainLayoutReverse: false,
      layoutTree: getDefaultLayoutTree(),
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

  function getCodeSizes() {
    const editor = persistState.panelEditor
    const output = persistState.showPreview || persistState.showConsole
      ? persistState.panelOutput
      : 0
    const terminal = persistState.showTerminal
      ? Math.max(0, 100 - editor - output)
      : 0

    return {
      editor,
      output,
      terminal,
    }
  }

  function setCodeSizes(sizes: Record<CodePanelId, number>) {
    persistState.panelEditor = sizes.editor
    persistState.panelOutput = sizes.output
  }

  function rebalanceCodePanels(nextVisible: Record<CodePanelId, boolean>) {
    const currentVisible: Record<CodePanelId, boolean> = {
      editor: true,
      output: persistState.showPreview || persistState.showConsole,
      terminal: persistState.showTerminal,
    }

    const currentSizes = getCodeSizes()
    const defaultSizes: Record<CodePanelId, number> = {
      editor: 100,
      output: 30,
      terminal: 20,
    }

    const result: Record<CodePanelId, number> = {
      editor: 0,
      output: 0,
      terminal: 0,
    }

    const keptVisible = (Object.keys(nextVisible) as CodePanelId[])
      .filter(id => nextVisible[id] && currentVisible[id])
    const newlyVisible = (Object.keys(nextVisible) as CodePanelId[])
      .filter(id => nextVisible[id] && !currentVisible[id])

    const newPanelsTarget = newlyVisible.reduce((sum, id) => sum + defaultSizes[id], 0)
    const availableForKept = Math.max(0, 100 - newPanelsTarget)

    if (keptVisible.length > 0) {
      const keptCurrentTotal = keptVisible.reduce((sum, id) => sum + currentSizes[id], 0)
      for (const id of keptVisible) {
        result[id] = keptCurrentTotal > 0
          ? (currentSizes[id] / keptCurrentTotal) * availableForKept
          : availableForKept / keptVisible.length
      }
    }

    if (newlyVisible.length > 0) {
      const newlyDefaultTotal = newlyVisible.reduce((sum, id) => sum + defaultSizes[id], 0)
      const targetForNewPanels = keptVisible.length > 0 ? newPanelsTarget : 100
      for (const id of newlyVisible) {
        result[id] = newlyDefaultTotal > 0
          ? (defaultSizes[id] / newlyDefaultTotal) * targetForNewPanels
          : targetForNewPanels / newlyVisible.length
      }
    }

    const visibleIds = (Object.keys(nextVisible) as CodePanelId[]).filter(id => nextVisible[id])
    const total = visibleIds.reduce((sum, id) => sum + result[id], 0)
    if (visibleIds.length > 0 && total !== 100)
      result[visibleIds[visibleIds.length - 1]] += 100 - total

    setCodeSizes(result)
  }

  function toggleTerminal() {
    const next = !persistState.showTerminal
    rebalanceCodePanels({
      editor: true,
      output: persistState.showPreview || persistState.showConsole,
      terminal: next,
    })
    persistState.showTerminal = next
  }

  function toggleConsole() {
    const next = !persistState.showConsole
    const nextOutputVisible = persistState.showPreview || next
    rebalanceCodePanels({
      editor: true,
      output: nextOutputVisible,
      terminal: persistState.showTerminal,
    })
    persistState.showConsole = next
  }

  function togglePreview() {
    const next = !persistState.showPreview
    const nextOutputVisible = next || persistState.showConsole
    rebalanceCodePanels({
      editor: true,
      output: nextOutputVisible,
      terminal: persistState.showTerminal,
    })
    persistState.showPreview = next
  }

  function setMainViewMode(mode: MainViewMode) {
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

  function movePanel(dragged: CodePanelId, insertBefore: CodePanelId | null) {
    const current = [...persistState.layoutTree.children] as LayoutLeaf[]
    const fromIdx = current.findIndex(c => c.id === dragged)
    if (fromIdx === -1) return
    const [item] = current.splice(fromIdx, 1)
    if (insertBefore === null) {
      current.push(item)
    }
    else {
      const toIdx = current.findIndex(c => c.id === insertBefore)
      if (toIdx === -1) current.push(item)
      else current.splice(toIdx, 0, item)
    }
    persistState.layoutTree = { ...persistState.layoutTree, children: current }
  }

  function setSplitDirection(direction: 'horizontal' | 'vertical') {
    persistState.layoutTree = { ...persistState.layoutTree, direction }
  }

  return {
    isPanelDragging,
    isContentDropdownShown,
    toggleTerminal,
    toggleConsole,
    togglePreview,
    setMainViewMode,
    setMainLayoutOrientation,
    toggleMainLayoutOrientation,
    toggleMainLayoutReverse,
    movePanel,
    setSplitDirection,
    resetLayout,
    ...toRefs(persistState),
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useUiState, import.meta.hot))
