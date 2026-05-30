<script setup lang="ts">
import { shikiToMonaco } from '@shikijs/monaco'
import { reloadLanguageTools } from '~/monaco/env'
import { initMonaco } from '~/monaco/setup'
import { getShiki } from '~/monaco/shiki'

const props = defineProps<{
  modelValue: string
  filepath: string
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'change', value: string): void
}>()

// 1. Remove the static import: import * as monaco from 'monaco-editor-core/esm/vs/editor/editor.api'
// 2. Create a local reference variable for the api object
let monaco: typeof import('monaco-editor-core/esm/vs/editor/editor.api') | null = null

let play: ReturnType<typeof usePlaygroundStore> | null = null

function getPlaygroundStore() {
  if (!play) {
    play = usePlaygroundStore()
  }
  return play
}

// Initialize Monaco ONLY on the client
onMounted(async () => {
  if (import.meta.client) {
    // Dynamically load the package only when mounting on the client
    monaco = await import('monaco-editor-core/esm/vs/editor/editor.api')
    initMonaco(getPlaygroundStore())
  }
})

const el = ref<HTMLDivElement>()
const colorMode = useColorMode()
const models = new Map<string, any>() // Using 'any' here since monaco types are dynamic now

const language = computed(() => {
  const ext = props.filepath.split('.').pop()
  switch (ext) {
    case 'js': return 'javascript'
    case 'ts': return 'typescript'
    case 'css': return 'css'
    case 'json': return 'json'
    case 'vue': return 'vue'
    case 'html': return 'html'
    default: return 'plaintext'
  }
})

const theme = computed(() => colorMode.value === 'dark' ? 'vesper' : 'amoxtli-light')

function getModel(filepath: string) {
  if (!monaco)
    return null

  let model: any
  if (!models.has(filepath)) {
    model = monaco.editor.createModel(
      props.modelValue,
      language.value,
      monaco.Uri.file(props.filepath),
    )
    models.set(filepath, model)
  }
  else {
    model = models.get(filepath)!
  }
  model.setValue(props.modelValue)
  return model
}

let cleanups: (() => void)[] = []

onUnmounted(() => {
  cleanups.forEach(cleanup => cleanup())
  cleanups = []
  models.forEach(model => model.dispose())
  models.clear()
})

watch(
  () => el.value,
  async (value) => {
    // Ensure we are on client and monaco module has loaded successfully
    if (!value || !import.meta.client)
      return
    if (!monaco) {
      monaco = await import('monaco-editor-core/esm/vs/editor/editor.api')
    }

    cleanups.forEach(cleanup => cleanup())
    cleanups = []

    const shiki = await getShiki()
    shikiToMonaco(shiki, monaco)

    const currentModel = getModel(props.filepath)
    if (!currentModel)
      return

    const editor = monaco.editor.create(
      value,
      {
        model: currentModel,
        theme: theme.value,
        fontSize: 12,
        bracketPairColorization: { enabled: false },
        glyphMargin: false,
        automaticLayout: true,
        folding: false,
        lineDecorationsWidth: 10,
        lineNumbersMinChars: 3,
        fontFamily: 'DM Mono, monospace',
        minimap: { enabled: false },
        padding: { top: 8 },
        overviewRulerLanes: 0,
        fixedOverflowWidgets: true,
      },
    )

    cleanups.push(() => {
      editor.dispose()
    })

    editor.onDidChangeModelContent(() => {
      const value = editor.getValue()
      emit('update:modelValue', value)
      emit('change', value)
    })

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {})

    cleanups.push(watch(
      () => props.filepath,
      () => {
        const m = getModel(props.filepath)
        if (m)
          editor.setModel(m)
      },
    ))

    cleanups.push(watch(
      () => props.modelValue,
      (value) => {
        if (value === editor.getValue())
          return
        const selections = editor.getSelections()
        const model = getModel(props.filepath)
        if (model) {
          model.setValue(value)
          if (selections)
            editor.setSelections(selections)
        }
      },
    ))

    cleanups.push(watch(
      () => getPlaygroundStore().status,
      (s) => {
        if (s === 'ready')
          reloadLanguageTools(getPlaygroundStore())
      },
    ))

    cleanups.push(watch(theme, () => monaco!.editor.setTheme(theme.value)))
  },
)
</script>

<template>
  <div ref="el" />
</template>
j
