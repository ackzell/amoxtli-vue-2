<script setup lang="ts">
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import { loadGuideMeta } from '~/composables/useGuideMeta'
import { unsavedDebug } from '~/composables/useUnsavedDebug'
import { challenges } from '~/db/challenges'

const router = useRouter()
const route = useRoute()
const guide = useGuideStore()
const { width: windowWidth } = useWindowSize()
const isMobile = computed(() => windowWidth.value > 0 && windowWidth.value < 768)

/**
 * Warn before a client-side navigation discards unsaved playground edits.
 *
 * Registered as both a leave guard (different route record) and an update
 * guard (same `[...slug]` record, different lesson) so every lesson-to-lesson
 * navigation is covered. Returning `false` cancels the navigation; the router
 * awaits the dialog choice because the guard is async.
 *
 * Registered before the page's top-level `await` so it runs in a synchronous
 * setup context (route guards rely on `inject`).
 */
function guardNavigation(to?: { path?: string }, from?: { path?: string }) {
  if (!import.meta.client)
    return true
  const unsaved = useUnsavedChangesStore()
  unsavedDebug('guard: evaluating', {
    to: to?.path,
    from: from?.path,
    dirty: unsaved.shouldGuard(),
    isDirty: usePlaygroundStore().isDirty,
    showingSolution: guide.showingSolution,
  })
  return unsaved.confirmOrDiscard('Saved before leaving the lesson').then((proceed) => {
    unsavedDebug('guard: decision', { to: to?.path, proceed })
    return proceed
  })
}

onBeforeRouteLeave(guardNavigation)
onBeforeRouteUpdate(guardNavigation)

function onBeforeUnload(event: BeforeUnloadEvent) {
  event.preventDefault()
  // Legacy browsers require a truthy `returnValue` to show the native prompt.
  event.returnValue = ''
}

if (import.meta.client) {
  const unsaved = useUnsavedChangesStore()
  // Only attach the unload listener while there is something to lose. A
  // persistent `beforeunload` listener disables the back/forward cache in
  // some browsers even when it never prevents the unload.
  watch(
    () => unsaved.shouldGuard(),
    (active) => {
      if (active)
        window.addEventListener('beforeunload', onBeforeUnload)
      else
        window.removeEventListener('beforeunload', onBeforeUnload)
    },
    { immediate: true },
  )
  onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))
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

  // If the challenge was already passed, restore the user's saved file contents
  // in the container so the editor shows the code they used to pass (not the
  // broken starting files). This is applied via `filesOverride` only — the
  // store's meta stays pristine so "Reset challenge" (from the show-solution
  // toggle) and "Retake challenge" always return to the broken starting files.
  let restoreFiles: Record<string, string> | undefined
  if (guideMeta?.sessionName && guideMeta?.files) {
    const record = await challenges.getByName(guideMeta.sessionName)
    if (record?.status === 'passed' && record.files) {
      restoreFiles = { ...guideMeta.files, ...record.files }
    }
  }

  // Eagerly update guide meta so reactive state (currentGuide, features) updates
  // immediately on navigation — before any async playground operations complete.
  guide.setGuideMeta(guideMeta)

  // Only mount the playground (code panel) if defaultLayout is not 'docs'
  if (guideMeta?.features?.defaultLayout !== 'docs') {
    await guide.mount(guideMeta, false, restoreFiles)
  }
}

router.afterEach(async (to, from, failure) => {
  unsavedDebug('afterEach: navigation settled', {
    to: to.path,
    from: from.path,
    aborted: !!failure,
  })
  // `afterEach` still runs when a guard aborts the navigation (the unsaved
  // changes guard returns `false`). Mounting here would swap the playground to
  // a lesson we never navigated to — so skip aborted/duplicated navigations.
  if (failure)
    return
  mount(to.path)
})

onMounted(() => {
  mount(router.currentRoute.value.path)
})
</script>

<template>
  <main
    id="main-content"
    tabindex="-1"
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
