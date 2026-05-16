<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content'

interface BreadcrumbItem {
  title: string
  path?: string
}

const route = useRoute()
const { locale, t } = useI18n()
const ui = useUiState()
const navRoot = ref<HTMLElement>()

function isNavInstanceVisible() {
  return !!navRoot.value && navRoot.value.offsetParent !== null
}

const collection = computed(() => locale.value === 'ja' ? 'ja' : 'en')
const routePath = computed(() => route.path)

const { data: page } = useAsyncData(
  () => `${locale.value}-${routePath.value}-docs-nav-page`,
  () => {
    return queryCollection(collection.value)
      .path(routePath.value)
      .first()
  },
  {
    watch: [collection, routePath],
  },
)
const { data: navigation } = useAsyncData(
  () => `${locale.value}-navigation`,
  () => {
    return queryCollectionNavigation(collection.value, [
      'title',
      'meta',
      'path',
    ])
  },
  {
    watch: [collection],
  },
)
const { data: surroundings } = useAsyncData(
  () => `${locale.value}-${routePath.value}-surroundings-nav`,
  () => {
    return queryCollectionItemSurroundings(collection.value, routePath.value, {
      fields: ['title', 'description'],
    })
  },
  {
    watch: [collection, routePath],
  },
)

const prev = computed(() => surroundings.value?.[0])
const next = computed(() => surroundings.value?.[1])
const navigationItems = computed(() => {
  const items = navigation.value || []
  // Unwrap a single root collection item (/, /en, /ja, etc.) so the locale
  // folder itself never appears as an empty-titled nav entry.
  if (items.length === 1 && items[0]?.children?.length)
    return items[0].children
  return items
})

function findNavItemFromPath(
  path: string,
  items: ContentNavigationItem[] | null | undefined = navigation.value,
): ContentNavigationItem | undefined {
  const item = items?.find(i => i.path === path)
  if (item)
    return item

  const parts = path.split('/').filter(Boolean)
  for (let i = parts.length - 1; i > 0; i--) {
    const parentPath = `/${parts.slice(0, i).join('/')}`
    const parent = items?.find(i => i.path === parentPath)
    if (parent)
      return findNavItemFromPath(path, parent.children || [])
  }
}

const breadcrumbs = computed(() => {
  const pagePath = page.value?.path || ''

  // Strip the locale prefix (/en, /ja) before splitting into segments so the
  // locale folder never becomes a breadcrumb entry.
  const localePrefix = `/${locale.value}`
  const pathWithoutLocale = pagePath.startsWith(localePrefix)
    ? pagePath.slice(localePrefix.length)
    : pagePath

  const parts = pathWithoutLocale.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = parts
    .map((_, idx): BreadcrumbItem => {
      // Search using the full path (with locale prefix) so nav item lookup works.
      const fullPath = `${localePrefix}/${parts.slice(0, idx + 1).join('/')}`
      const item = findNavItemFromPath(fullPath)
      return {
        title: item?.title || parts[idx] || 'Not found',
        path: item ? fullPath : undefined,
      }
    })

  // When on the root locale page (/en), parts is empty so no page-title
  // breadcrumb is produced. Look up the nav item for the locale root explicitly
  // so /en gets the same "Guide > Introduction" treatment as sub-pages.
  if (parts.length === 0 && pagePath) {
    const item = findNavItemFromPath(pagePath)
    if (item?.title) {
      breadcrumbs.push({ title: item.title, path: pagePath })
    }
  }

  const localePath = useLocalePath()

  if (!breadcrumbs.find(i => i.path === localePath('/'))) {
    breadcrumbs.unshift({
      title: t('guide'),
      path: localePath('/'),
    })
  }

  return breadcrumbs
})

function toggleDropdownFromNav() {
  ui.isContentDropdownShown = !ui.isContentDropdownShown
}

onClickOutside(navRoot, () => {
  if (!isNavInstanceVisible())
    return

  ui.isContentDropdownShown = false
})

onKeyStroke('Escape', () => {
  if (!ui.isContentDropdownShown)
    return

  ui.isContentDropdownShown = false
})
</script>

<template>
  <div flex items-center justify-around gap-2 px2 sm:mt0>
    <NuxtLink
      v-if="prev"
      :to="prev.path"
      :title="`Previous: ${prev.title}`"
      hover="bg-active text-primary dark:text-primary-dark op100"
      z-110 h-full w10 flex items-center justify-center rounded-md text-sm op70
    >
      <div i-carbon-arrow-left />
    </NuxtLink>
    <!-- flex-grow spacer so the absolute child can anchor to the bar position -->
    <div ref="navRoot" class="nav-bar-anchor group relative z-110 min-w-0 flex-grow">
      <!-- Single bordered box: contains both trigger bar and dropdown panel -->
      <div
        class="overflow-hidden border rounded-lg transition-colors duration-300 dark:border-bgr-700 hover:border-primary hover:shadow-md dark:hover:border-primary-dark dark:hover-shadow-dark-950"
      >
        <!-- Trigger bar -->
        <div
          flex="~ gap-x-2 gap-y-1 items-center wrap"
          bg-bgr-50 px4 py2 outline-none dark:bg-bgr-800
          role="button"
          tabindex="0"
          @click="toggleDropdownFromNav"
          @keydown.enter.prevent="ui.isContentDropdownShown = !ui.isContentDropdownShown"
          @keydown.space.prevent="ui.isContentDropdownShown = !ui.isContentDropdownShown"
        >
          <div i-mynaui-book flex-none />
          <template v-for="bc, idx of breadcrumbs" :key="bc.path">
            <div v-if="idx !== 0" i-ph-caret-right mx--1 text-sm op50 />
            <NuxtLink :to="bc.path" text-sm hover="text-primary dark:text-primary-dark" @click.stop>
              {{ bc.title }}
            </NuxtLink>
          </template>
          <div h-1em flex-auto />
          <div
            i-ph-caret-down-duotone text-sm op50 transition duration-400
            :class="ui.isContentDropdownShown ? 'rotate-180' : ''"
          />
        </div>
        <!-- Dropdown panel: always in DOM, height driven purely by CSS grid rows -->
        <div
          class="nav-dropdown-panel"
          :class="{ 'nav-dropdown-panel-open': ui.isContentDropdownShown }"
          :aria-hidden="!ui.isContentDropdownShown"
          @click.stop
        >
          <div class="nav-dropdown-inner">
            <div
              border="t base"
              class="bg-bgr/80 dark:bg-bgr-dark/70"
              max-h-60vh overflow-y-auto py2 text-sm backdrop-blur-md
            >
              <ContentNavItem
                v-for="item of navigationItems"
                :key="item.path"
                :item="item"
                :current="route.path"
                :level="1"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    <NuxtLink
      v-if="next"
      :to="next.path"
      :title="`Next: ${next.title}`"
      hover="bg-active text-primary dark:text-primary-dark op100"
      z-110 h-full h10 w10 flex items-center justify-center rounded-md text-sm op70
    >
      <div i-carbon-arrow-right />
    </NuxtLink>
  </div>
</template>

<style>
.nav-dropdown-panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-dropdown-panel-open {
  grid-template-rows: 1fr;
}

.nav-dropdown-inner {
  overflow: hidden;
  min-height: 0;
}

.nav-bar-anchor {
  height: 2.5rem;
}
</style>
