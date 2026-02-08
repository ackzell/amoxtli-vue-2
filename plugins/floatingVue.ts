import { options } from 'floating-vue'

export default defineNuxtPlugin(() => {
  options.themes['guide-tooltip'] = {
    $extend: 'tooltip',
    $resetCss: true,
  }
})
