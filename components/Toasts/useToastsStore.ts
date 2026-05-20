import { defineStore } from 'pinia'
import { reactive } from 'vue'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  description: string
  duration?: number
  createdTimestamp: number
}

const defaultToast: Omit<Toast, 'id'> = {
  type: 'info',
  title: '',
  description: '',
  duration: 4000,
  createdTimestamp: 0,
}

export const useToastsStore = defineStore('toastsStore', () => {
  const activeToasts = reactive<Toast[]>([])

  function addToast(toast: Omit<Partial<Toast>, 'id'>): string {
    const id = crypto.randomUUID().slice(0, 8)
    activeToasts.push({
      id,
      ...defaultToast,
      ...toast,
      createdTimestamp: Date.now(),
    })
    return id
  };

  function dismiss(id: string): void {
    const index = activeToasts.findIndex(t => t.id === id)
    if (index > -1)
      activeToasts.splice(index, 1)
  };

  function dismissAll(): void {
    activeToasts.splice(0)
  };

  function success(title: string, toast?: Omit<Partial<Toast>, 'id'>): string {
    return addToast({ ...toast, title, type: 'success' })
  };

  function error(title: string, toast?: Omit<Partial<Toast>, 'id'>): string {
    return addToast({ ...toast, title, type: 'error' })
  };

  function info(title: string, toast?: Omit<Partial<Toast>, 'id'>): string {
    return addToast({ ...toast, title, type: 'info' })
  };

  function warning(title: string, toast?: Omit<Partial<Toast>, 'id'>): string {
    return addToast({ ...toast, title, type: 'warning' })
  };

  return {
    activeToasts,

    toast: {
      success,
      error,
      info,
      warning,
      dismiss,
      dismissAll,
    },

  }
})
