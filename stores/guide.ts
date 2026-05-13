import type { Raw } from 'vue'
import type { GuideMeta, PlaygroundFeatures } from '~/types/guides'

const defaultFeatures = Object.freeze(<PlaygroundFeatures>{
  fileTree: false,
  terminal: false,
  console: false,
  download: true,
})

function toPlain<T>(value: T): T {
  if (value == null)
    return value
  return JSON.parse(JSON.stringify(value)) as T
}

export const useGuideStore = defineStore('guide', () => {

  let play: ReturnType<typeof usePlaygroundStore> | null = null

  function getPlaygroundStore() {
    if (!play) {
      play = usePlaygroundStore()
    }
    return play
  }

  const ui = useUiState()
  const preview = usePreviewStore()

  const features = ref<PlaygroundFeatures>(defaultFeatures)
  const currentGuide = shallowRef<Raw<GuideMeta>>()
  const showingSolution = ref(false)
  const embeddedDocs = ref('')

  const ignoredFiles = computed(() => transformGuideIgnoredFiles(currentGuide.value?.ignoredFiles))

  watch(features, () => {
    if (features.value.fileTree === true) {
      if (ui.panelFileTree <= 0)
        ui.panelFileTree = 20
    }
    else if (features.value.fileTree === false) {
      ui.panelFileTree = 0
    }

    if (features.value.terminal === true)
      ui.showTerminal = true
    else if (features.value.terminal === false)
      ui.showTerminal = false

    if (features.value.console === true)
      ui.showConsole = true
    else if (features.value.console === false)
      ui.showConsole = false
  })

  async function mount(guide?: GuideMeta, withSolution = false) {
    const playgroundStore = getPlaygroundStore()
    if (!playgroundStore.webcontainer) {
      await playgroundStore.init()
    }

    const templateName = guide?.template === 'html' ? 'html' : 'vue'

    await playgroundStore.mount({
      ...guide?.files,
      ...withSolution ? guide?.solutions : {},
    }, templateName)

    playgroundStore.fileSelected = playgroundStore.files.get(guide?.startingFile || 'app.vue')
    preview.setFullPath(guide?.startingUrl || '/')

    const safeGuide = toPlain(guide)

    features.value = {
      ...defaultFeatures,
      ...safeGuide?.features,
    }
    currentGuide.value = safeGuide
    showingSolution.value = withSolution

    return undefined
  }

  async function toggleSolutions() {
    await mount(currentGuide.value, !showingSolution.value)
  }

  function openEmbeddedDocs(url: string) {
    embeddedDocs.value = url
  }

  function setGuideMeta(guideMeta?: GuideMeta) {
    const safeGuide = toPlain(guideMeta)

    features.value = {
      ...defaultFeatures,
      ...safeGuide?.features,
    }
    currentGuide.value = safeGuide
  }

  return {
    mount,
    toggleSolutions,
    setGuideMeta,
    features,
    currentGuide,
    showingSolution,
    embeddedDocs,
    openEmbeddedDocs,
    ignoredFiles,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useGuideStore, import.meta.hot))
