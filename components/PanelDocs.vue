<script setup lang="ts">
// const runtime = useRuntimeConfig()
const route = useRoute()
const { locale } = useI18n()

const collection = computed(() => locale.value === 'es_mx' ? 'es_mx' : 'en')

const { data: page } = useAsyncData(`${locale.value}-${route.path}`, () => {
  return queryCollection(collection.value)
    .path(route.path)
    .first()
})
const { data: surroundings } = useAsyncData(`${locale.value}-${route.path}-surroundings`, () => {
  return queryCollectionItemSurroundings(collection.value, route.path, {
    fields: ['title', 'description'],
  })
})

useHead({
  title: page.value?.title,
})

useSeoMeta({
  title: page.value?.title,
  description: page.value?.description,
})

const prev = computed(() => surroundings.value?.[0])
const next = computed(() => surroundings.value?.[1])

// const sourceUrl = computed(() =>
//   page.value?.id
//     ? `${runtime.public.repoUrl}/edit/main/content/${page.value.stem}.${page.value.extension}`
//     : undefined,
// )

const docsEl = ref<HTMLElement | null>(null)
const router = useRouter()
router.beforeEach(() => {
  docsEl.value?.scrollTo({
    top: 0,
  })
})

// Pull-to-refresh
const pullThreshold = 72
const pullY = ref(0)
const isPulling = ref(false)
const isRefreshing = ref(false)

let touchStartY = 0

function onTouchStart(e: TouchEvent) {
  if ((docsEl.value?.scrollTop ?? 0) === 0) {
    touchStartY = e.touches[0]!.clientY
    isPulling.value = true
  }
}

function onTouchMove(e: TouchEvent) {
  if (!isPulling.value)
    return
  const dy = e.touches[0]!.clientY - touchStartY
  if (dy > 0) {
    pullY.value = Math.min(dy, pullThreshold * 1.5)
  }
  else {
    isPulling.value = false
    pullY.value = 0
  }
}

function onTouchEnd() {
  if (pullY.value >= pullThreshold && !isRefreshing.value) {
    isRefreshing.value = true
    pullY.value = pullThreshold
    setTimeout(() => window.location.reload(), 300)
  }
  else {
    pullY.value = 0
    isPulling.value = false
  }
}

const pullProgress = computed(() => Math.min(pullY.value / pullThreshold, 1))
const showPullIndicator = computed(() => pullY.value > 0)
</script>

<template>
  <div relative of-scroll class="panel-docs-container">
    <!-- Pull-to-refresh indicator -->
    <div
      v-if="showPullIndicator"

      flex pointer-events-none items-center left-0 right-0 top-0 justify-center absolute z-10
      :style="{ height: `${pullY}px` }"
    >
      <div

        border="~ base"
        rounded-full bg-base flex h-8 w-8 shadow-sm transition-transform items-center justify-center
        :style="{ transform: `rotate(${pullProgress * 360}deg)`, opacity: pullProgress }"
      >
        <div
          h-4 w-4
          :class="isRefreshing ? 'i-ph-circle-notch animate-spin' : 'i-ph-arrow-clockwise'"
        />
      </div>
    </div>

    <article
      ref="docsEl"
      class="prose"
      p6 h-full pb="[calc(1.5rem+max(5rem,calc(5rem+env(safe-area-inset-bottom))))]"
      :style="{ transform: showPullIndicator ? `translateY(${pullY}px)` : undefined, transition: isPulling ? 'none' : 'transform 0.2s ease' }"
      @touchstart.passive="onTouchStart"
      @touchmove.passive="onTouchMove"
      @touchend="onTouchEnd"
    >
      <ContentRenderer v-if="page" :key="page.id" :value="page" class="m-auto max-w-3xl" />
      <div mt8 py2 grid="~ cols-[1fr_1fr] gap-4" class="m-auto max-w-3xl">
        <div>
          <ContentNavCard
            v-if="prev"
            :to="prev.path"
            :title="prev.title"
            :description="prev.description as string"
            subheader="Previous section"
            icon="i-ph-arrow-left"
          />
        </div>
        <div>
          <ContentNavCard
            v-if="next"
            :to="next.path"
            :title="next.title"
            :description="next.description as string"
            subheader="Next section"
            icon="i-ph-arrow-right"
            text-right items-end
          />
        </div>
      </div>
      <!-- <div border="t base dashed" mt-8 p3>
        <NuxtLink
          v-if="sourceUrl"
          :to="sourceUrl" target="_blank"
          flex="~ items-center gap-2"
          text-inherit op75
          hover="text-primary dark:text-primary-dark op100"
        >
          <div i-ph-note-pencil-duotone />
          {{ $t('edit-this-page') }}
        </NuxtLink>
      </div> -->
    </article>
  </div>
</template>

<style scoped>
.panel-docs-container {
  height: calc(100% - 4rem);
}
</style>
