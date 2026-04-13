import type { CodePanelId } from '~/types/layout'

const _draggedPanel = ref<CodePanelId | null>(null)

export function useLayoutDrag() {
  function startDrag(id: CodePanelId, event: DragEvent) {
    _draggedPanel.value = id
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', id)
    }
  }

  function endDrag() {
    _draggedPanel.value = null
  }

  return {
    draggedPanel: readonly(_draggedPanel),
    startDrag,
    endDrag,
  }
}
