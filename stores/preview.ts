import type { ClientInfo } from '~/types/rpc'

export const usePreviewStore = defineStore('preview', () => {
  const location = ref({
    origin: '',
    fullPath: '',
  })
  const url = ref('')
  const clientInfo = ref<ClientInfo>()
  const pendingFullPath = ref('/')

  function updateUrl() {
    url.value = location.value.origin + location.value.fullPath
  }

  function setFullPath(path: string) {
    pendingFullPath.value = path
    location.value.fullPath = path
  }

  return {
    clientInfo,
    location,
    url,
    updateUrl,
    setFullPath,
    pendingFullPath,
  }
})
