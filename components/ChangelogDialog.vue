<script setup lang="ts">
import { parseChangelog } from '~/lib/changelog/parse'
import changelogRaw from '../CHANGELOG.md?raw'

const isOpen = defineModel<boolean>('open', { default: false })

const releases = computed(() => parseChangelog(changelogRaw))

const VISIBLE_BY_DEFAULT = 3
const showAll = ref(false)
const visibleReleases = computed(() =>
  showAll.value ? releases.value : releases.value.slice(0, VISIBLE_BY_DEFAULT))
const hiddenCount = computed(() => Math.max(0, releases.value.length - VISIBLE_BY_DEFAULT))

watch(isOpen, (val) => {
  if (!val) {
    showAll.value = false
  }
})
</script>

<template>
  <UiDialog v-model:open="isOpen">
    <UiDialogContent class="sm:max-w-xl">
      <UiDialogHeader>
        <UiDialogTitle>{{ $t('changelog.title') }}</UiDialogTitle>
        <UiDialogDescription>
          <p>{{ $t('changelog.description') }}</p>
        </UiDialogDescription>
      </UiDialogHeader>

      <UiScrollArea class="max-h-[60vh]" flex="~ col" px4>
        <div flex="~ col gap-6" pb2>
          <template v-for="release of visibleReleases" :key="release.version">
            <section>
              <header flex="~ items-center gap-2">
                <h3
                  text-base text-primary font-bold font-code dark:text-primary-dark
                >
                  {{ `v${release.version}` }}
                </h3>
                <span
                  v-if="release === releases[0]"
                  class="text-sm text-primary px-1.5 py-0.5 rounded bg-bgr-700 dark:text-foreground dark:bg-bgr-50"
                >
                  {{ $t('changelog.latest') }}
                </span>
                <time v-if="release.date" text-xs ml-auto op50>{{ release.date }}</time>
                <a
                  v-if="release.compareUrl"
                  :href="release.compareUrl"
                  target="_blank"
                  rel="noopener"
                  :title="$t('changelog.see-all-changes')"
                  class="transition-ok op40 flex items-center hover:text-primary hover:op100 dark:hover:text-primary-dark"
                >
                  <div i-ph-arrow-square-out text-sm />
                </a>
              </header>

              <div
                v-for="section of release.sections"
                :key="section.heading"
                mt3
              >
                <h4 class="text-xs tracking-wider font-semibold mb1 op50 uppercase">
                  {{ section.heading }}
                </h4>
                <ul flex="~ col gap-1.5">
                  <li
                    v-for="(item, i) of section.items"
                    :key="i"
                    flex="~ gap-1.5 items-baseline"
                    text-sm leading-snug
                  >
                    <span i-ph-dot-outline op30 flex-none />
                    <span>
                      <strong v-if="item.scope" text-primary font-medium dark:text-primary-dark>
                        {{ `${item.scope}: ` }}
                      </strong>
                      <span class="whitespace-pre-wrap">{{ item.text }}</span>
                      <span v-for="commit of item.commits" :key="commit.short" ml-2>
                        <a
                          :href="commit.url"
                          target="_blank"
                          rel="noopener"
                          text-xs font-mono op40 hover:text-primary hover:op100 dark:hover:text-primary-dark
                        >
                          {{ commit.short }}
                        </a>
                      </span>
                    </span>
                  </li>
                </ul>
              </div>
            </section>
          </template>

          <button
            v-if="hiddenCount > 0"
            class="text-sm font-medium px-3 py-2 border border-base rounded-md bg-bgr-50 transition-colors hover:text-primary hover:border-primary dark:bg-bgr-800 dark:hover:text-primary-dark dark:hover:border-primary-dark"
            @click="showAll = !showAll"
          >
            {{ showAll ? $t('changelog.show-less') : $t('changelog.show-earlier', { count: hiddenCount }) }}
          </button>
        </div>
      </UiScrollArea>
    </UiDialogContent>
  </UiDialog>
</template>
