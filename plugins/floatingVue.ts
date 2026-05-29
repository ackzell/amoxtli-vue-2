import { options } from 'floating-vue'

export default defineNuxtPlugin(() => {
  options.themes['icon-button-tooltip'] = {
    $extend: 'tooltip',
    $resetCss: true,
    distance: 2,
  }

  options.themes['layout-dropdown'] = {
    $extend: 'dropdown',
    $resetCss: true,
    distance: 2,
  }
})
