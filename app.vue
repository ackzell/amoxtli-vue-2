<script setup lang="ts">
import '@unocss/reset/tailwind.css'
import './styles/base.css'
import './styles/prose.css'
import './styles/overrides.css'

useThemeTransition()

if (import.meta.hot) {
  import.meta.hot.on('template:update', (data: { filename: string, content: string }) => {
    console.warn('🔥 [app.vue] HMR template:update received!', data.filename)
    if (import.meta.client) {
      const playground = usePlaygroundStore()
      const file = playground.files.get(data.filename)
      if (file) {
        console.warn('🔥 [app.vue] writing live content to VirtualFile:', data.filename)
        file.write(data.content)
        // Dispatch custom event just in case PanelEditor needs to react
        window.dispatchEvent(new CustomEvent('template-file-updated', { detail: data }))
      }
    }
  })
}
</script>

<template>
  <NuxtPage page-key="playground" />
</template>
