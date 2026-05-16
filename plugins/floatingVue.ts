import { options } from 'floating-vue'

export default defineNuxtPlugin(() => {
  options.themes['guide-tooltip'] = {
    $extend: 'tooltip',
    $resetCss: true,
  }

  options.themes['icon-button-tooltip'] = {
    $extend: 'tooltip',
    $resetCss: true,
    distance: 2,
  }
})

if (import.meta.hot) {
  import.meta.hot.on('template:update', (data: { filename: string, content: string }) => {
    console.warn('🔥 [floatingVue plugin] HMR template:update received!', data.filename, 'length:', data.content?.length)
    if (import.meta.client) {
      window.dispatchEvent(new CustomEvent('template-file-updated', { detail: data }))
    }
  })
}
