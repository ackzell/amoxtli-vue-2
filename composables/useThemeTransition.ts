export function useThemeTransition() {
  if (!import.meta.client) {
    return
  }

  onMounted(() => {
    const root = document.documentElement

    const getThemeClass = () => {
      if (root.classList.contains('dark')) {
        return 'dark'
      }
      if (root.classList.contains('light')) {
        return 'light'
      }
      return undefined
    }

    let theme = getThemeClass()
    if (theme) {
      root.classList.add('theme-ready')
    }

    useMutationObserver(root, (mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== 'attributes' || mutation.attributeName !== 'class') {
          continue
        }

        const nextTheme = getThemeClass()
        if (!nextTheme || nextTheme === theme) {
          continue
        }

        theme = nextTheme

        root.classList.remove('theme-ready')
        requestAnimationFrame(() => {
          setTimeout(() => root.classList.add('theme-ready'), 900)
        })
      }
    }, { attributes: true })
  })
}
