<script setup lang="ts">
const router = useRouter()
const route = useRoute()
const guide = useGuideStore()

const templatesMap = Object.fromEntries(
  Object.entries(import.meta.glob('~/content/**/.template/index.ts'))
    .map(([key, loader]) => [
      key
        .replace(/^\/content/, '')
        .replace(/\/\.template\/index\.ts$/, '')
        .replace(/\/\d+\./g, '/'),
      loader,
    ]),
)

function normalizePath(path: string) {
  return path.replace(/\/$/, '')
}

async function loadGuideMeta(path: string) {
  const normalized = normalizePath(path)
  const result = await templatesMap[normalized]?.().then((m: any) => m.meta) ?? null
  
  if (result?.files) {
    // In dev mode, always fetch the freshest files to bypass Vite/SSR caching
    if (import.meta.dev && import.meta.client) {
      for (const fname of Object.keys(result.files)) {
        try {
          const filePath = `${normalized}/.template/files/${fname}`
          const res = await $fetch<{ content?: string }>(`/api/dev-template`, {
            query: { path: filePath.replace(/^\//, '') }
          })
          if (res && res.content !== undefined) {
            result.files[fname] = res.content
          }
        } catch (e) {
          // Fallback to cached content
        }
      }
    }
    
    console.warn('📦 [slug] loadGuideMeta files for', normalized)
    for (const [fname, fcontent] of Object.entries(result.files)) {
      console.warn(`  📄 ${fname}: ${(fcontent as string).length} chars, first 80: ${(fcontent as string).slice(0, 80)}`)
    }
  }

  return result
}

// Load guide meta eagerly so guide.features.defaultLayout is set before first render.
// This ensures isDocsOnlyMode is correct and the code panel won't mount for docs-only lessons.
const { data: initialMeta } = await useAsyncData(
  `guide-meta-${route.path}`,
  () => loadGuideMeta(route.path),
)

if (initialMeta.value) {
  guide.setGuideMeta(initialMeta.value)
}

async function mount(path: string) {
  const guideMeta = await loadGuideMeta(path)

  // Only mount the playground (code panel) if defaultLayout is not 'docs'
  if (guideMeta?.features?.defaultLayout !== 'docs') {
    await guide.mount(guideMeta, false)
  }
  else {
    // Set features for layout configuration without initializing the playground
    guide.setGuideMeta(guideMeta)
  }
}

router.afterEach(async (to) => {
  mount(to.path)
})

onMounted(() => {
  mount(router.currentRoute.value.path)
})
</script>

<template>
  <main
    h-100dvh h-screen w-screen of-hidden
    grid="~ rows-[max-content_1fr]"
  >
    <header>
      <TheNav />
    </header>
    <MainPlayground />
    <CommandPalette />
  </main>
</template>
