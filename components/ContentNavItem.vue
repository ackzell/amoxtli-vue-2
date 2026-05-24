<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content'

const props = withDefaults(
  defineProps<{
    item: ContentNavigationItem
    level?: number
    current?: string
  }>(),
  {
    level: 0,
  },
)

const route = useRoute()
const ui = useUiState()

const resolved = computed(() => {
  if (props.item.children?.length === 1)
    return props.item.children[0]
  return props.item
})

const paddingLeft = computed(() => `${0.5 + props.level * 0.8}rem`)
</script>

<template>
  <div v-if="resolved && (!(resolved.meta as any)?.unlisted || current?.startsWith(resolved.path))" class="content-nav-item font-mono">
    <template v-if="resolved.children?.length">
      <details :open="route.path.includes(resolved.path)">
        <summary>
          <div
            flex="~ gap-1 items-center" px1 py0.5 cursor-pointer select-none
            hover="text-primary dark:text-primary-dark bg-active"
            :style="{ paddingLeft }"
          >
            <div class="caret" un-transition i-mynaui-chevron-right-solid text-sm op50 flex-none duration-400 />
            <div i-mynaui-folder-solid opacity-50 flex-none />
            <div ml1>
              {{ resolved.title }}
            </div>
          </div>
        </summary>
        <div v-if="resolved.children?.length">
          <ContentNavItem
            v-for="child of resolved.children"
            :key="child.path"
            :item="child"
            :current="current"
            :level="props.level + 1"
          />
        </div>
      </details>
    </template>
    <NuxtLink
      v-else
      :to="resolved.path"
      :style="{ paddingLeft }"
      :class="{ 'text-primary dark:text-primary-dark bg-bgr-50 dark:bg-bgr-900': resolved.path === route.path }"
      flex="~ gap-1 items-center"
      hover="text-primary dark:text-primary-dark bg-active" px1 py0.5
      @click="ui.isContentDropdownShown = false"
    >
      <div class="caret" un-transition i-mynaui-chevron-right-solid text-sm op0 flex-none duration-400 />
      <div v-if="resolved.meta.isChallenge" i-mynaui-lightning-solid text-challenge op50 flex-none />
      <div v-else i-mynaui-file-solid op50 flex-none />
      <div ml1>
        {{ resolved.title }}
      </div>
    </NuxtLink>
  </div>
</template>

<style>
.content-nav-item details summary {
  list-style-type: none;
}

.content-nav-item details[open] .caret {
  transform: rotate(90deg);
}
</style>
