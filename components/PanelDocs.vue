<script setup lang="ts">
const runtime = useRuntimeConfig()
const route = useRoute()
const { locale } = useI18n()

const collection = computed(() => locale.value === 'ja' ? 'ja' : 'en')

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

const sourceUrl = computed(() =>
  page.value?.id
    ? `${runtime.public.repoUrl}/edit/main/content/${page.value.stem}.${page.value.extension}`
    : undefined,
)

const docsEl = ref<HTMLElement | null>(null)
const router = useRouter()
router.beforeEach(() => {
  docsEl.value?.scrollTo({
    top: 0,
  })
})
</script>

<template>
  <div relative h-full of-hidden>
    <article ref="docsEl" class="max-w-none prose" h-full of-auto p6>
      <ContentRenderer v-if="page" :key="page.id" :value="page" />
      <div mt8 py2 grid="~ cols-[1fr_1fr] gap-4">
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
            items-end text-right
          />
        </div>
      </div>
      <div border="t base dashed" mt-8 p3>
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
      </div>
    </article>
  </div>
</template>
