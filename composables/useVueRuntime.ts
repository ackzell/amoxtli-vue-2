const VUE_CDN = 'https://unpkg.com/vue@3/dist/vue.global.prod.js'

interface RuntimeCache {
  text: string
  blobUrl: string
}

let cached: RuntimeCache | null = null
let fetchPromise: Promise<RuntimeCache> | null = null

async function fetchRuntime(): Promise<RuntimeCache> {
  if (cached)
    return cached

  if (fetchPromise)
    return fetchPromise

  fetchPromise = (async () => {
    const res = await fetch(VUE_CDN)
    const text = await res.text()
    const blob = new Blob([text], { type: 'application/javascript' })
    const blobUrl = URL.createObjectURL(blob)
    cached = { text, blobUrl }
    return cached
  })()

  try {
    return await fetchPromise
  }
  finally {
    fetchPromise = null
  }
}

export function useVueRuntime() {
  const vueRuntime = ref('')
  const vueVersion = ref('')
  const blobUrl = ref('')
  const loading = ref(true)
  const error = ref<string | null>(null)

  onMounted(async () => {
    try {
      const result = await fetchRuntime()
      vueRuntime.value = result.text
      blobUrl.value = result.blobUrl
      const vMatch = text.match(/vue\s+v(\d+\.\d+\.\d+(?:-\w+(?:\.\d+)?)?)/i)
      vueVersion.value = vMatch?.[1] ?? ''
    }
    catch (e) {
      error.value = (e as Error).message
    }
    finally {
      loading.value = false
    }
  })

  return { vueRuntime, vueVersion, blobUrl, loading, error }
}
