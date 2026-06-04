<script setup lang="ts">
const router = useRouter()
const route = useRoute()
const guide = useGuideStore()
const { width: windowWidth } = useWindowSize()
const isMobile = computed(() => windowWidth.value > 0 && windowWidth.value < 768)

const templatesMap = Object.fromEntries(
  Object.entries(import.meta.glob('~/content/**/.template/index.ts'))
    .map(([key, loader]) => [
      key
        .replace(/^\/content/, '')
        .replace(/\/\.template\/index\.ts$/, '')
        .replace(/\/\d+[a-z]*\./gi, '/'),
      loader,
    ]),
)

function normalizePath(path: string) {
  return path.replace(/\/$/, '').replace(/\/\d+[a-z]*\./gi, '/')
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
            query: { path: filePath.replace(/^\//, '') },
          })
          if (res && res.content !== undefined) {
            result.files[fname] = res.content
          }
        }
        catch (e) {
          // Fallback to cached content
        }
      }
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

  // Eagerly update guide meta so reactive state (currentGuide, features) updates
  // immediately on navigation — before any async playground operations complete.
  guide.setGuideMeta(guideMeta)

  // Only mount the playground (code panel) if defaultLayout is not 'docs'
  if (guideMeta?.features?.defaultLayout !== 'docs') {
    await guide.mount(guideMeta, false)
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
    h-100dvh w-screen of-hidden
    grid="~ rows-[max-content_1fr]"
  >
    <header>
      <TheNav />
    </header>
    <MainPlayground />
    <MobilePanelToggle v-if="isMobile" />
    <CommandPalette />
  </main>
</template>
