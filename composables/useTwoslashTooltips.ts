import type { VNode } from 'vue'
import { h, render } from 'vue'
import TwoslashTooltipAdapter from '~/components/content/TwoslashTooltipAdapter.vue'

let _counter = 0
function uid(): string {
  return `tt-${++_counter}`
}

export function useTwoslashTooltips(containerEl: Ref<HTMLElement | undefined>) {
  if (import.meta.server)
    return

  let mountedComponents: Array<{ mount: HTMLElement; vnode: VNode }> = []

  function wire(container: HTMLElement) {
    mountedComponents.forEach(({ mount, vnode }) => {
      render(null, mount)
      mount.remove()
    })
    mountedComponents = []

    const triggers = container.querySelectorAll<HTMLElement>('.twoslash-hover')

    triggers.forEach((el) => {
      const content = el.getAttribute('data-content')
      if (!content)
        return

      const id = uid()
      const tokenHtml = el.innerHTML
      const persisted = el.classList.contains('twoslash-query-persisted')

      const mount = document.createElement('span')
      mount.className = 'twoslash-mounted'

      el.parentNode?.replaceChild(mount, el)

      const vnode = h(TwoslashTooltipAdapter, {
        id,
        content,
        tokenHtml,
        persisted,
      })
      render(vnode, mount)

      mountedComponents.push({ mount, vnode })
    })
  }

  onMounted(() => {
    watch(
      containerEl,
      (el) => {
        if (el)
          nextTick(() => wire(el))
      },
      { immediate: true },
    )
  })

  onUnmounted(() => {
    mountedComponents.forEach(({ mount, vnode }) => {
      render(null, mount)
      mount.remove()
    })
    mountedComponents = []
  })
}
