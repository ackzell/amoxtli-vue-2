<script setup lang="ts">
const ui = useUiState()
const guide = useGuideStore()

const lessonForcesDocsOnly = computed(() => guide.currentGuide?.features?.defaultLayout === 'docs')
const effectiveMainViewMode = computed(() => {
  if (lessonForcesDocsOnly.value)
    return 'docs'
  return ui.mainViewMode
})

// Only access playground store when actually needed (for download functionality)
let play: ReturnType<typeof usePlaygroundStore> | null = null

function getPlaygroundStore() {
  // Don't create playground store in docs mode
  if (effectiveMainViewMode.value === 'docs') {
    return null
  }
  if (!play) {
    play = usePlaygroundStore()
  }
  return play
}
const isCodeFocusApplied = computed(() => effectiveMainViewMode.value === 'code')
const isDocsFocusApplied = computed(() => effectiveMainViewMode.value === 'docs')
const isVerticalLayoutApplied = computed(() => ui.mainLayoutOrientation === 'vertical')
const isReverseLayoutApplied = computed(() => ui.mainLayoutReverse)
const hasCustomLayoutApplied = computed(() => {
  return effectiveMainViewMode.value !== 'split'
    || isVerticalLayoutApplied.value
    || isReverseLayoutApplied.value
})

function setMainViewMode(mode: 'split' | 'code' | 'docs') {
  if (lessonForcesDocsOnly.value && mode !== 'docs')
    return
  ui.setMainViewMode(mode)
}

function toggleCodeOnly() {
  if (lessonForcesDocsOnly.value)
    return
  setMainViewMode(effectiveMainViewMode.value === 'code' ? 'split' : 'code')
}

function toggleDocsOnly() {
  setMainViewMode(effectiveMainViewMode.value === 'docs' ? 'split' : 'docs')
}

// const runtime = useRuntimeConfig()

// const buildTime = new Date(runtime.public.buildTime)
// const timeAgo = useTimeAgo(buildTime)

function downloadCurrentGuide() {
  const playgroundStore = getPlaygroundStore()
  if (!playgroundStore?.webcontainer)
    throw new Error('No webcontainer found')

  if (playgroundStore.status !== 'ready')
    throw new Error('Playground is not ready')

  if (!guide.features.download)
    throw new Error(`Download feature is disabled for guide ${guide.currentGuide}`)

  downloadZip(playgroundStore.webcontainer, guide.ignoredFiles)
}

const i18n = useI18n()

addCommands(
  {
    id: 'download-zip',
    title: () => $t('download-zip'),
    visible: () => {
      const playgroundStore = getPlaygroundStore()
      return playgroundStore?.status === 'ready' && guide.features.download !== false
    },
    handler: () => {
      downloadCurrentGuide()
    },
    icon: 'i-ph-download-duotone',
  },
  {
    id: 'layout-main-view-split',
    title: 'Layout: Split View',
    handler: () => {
      setMainViewMode('split')
    },
    icon: 'i-mynaui:layout',
  },
  {
    id: 'layout-main-view-code',
    title: 'Layout: Code Focus',
    handler: () => {
      setMainViewMode('code')
    },
    icon: 'i-mynaui:code',
    visible: () => !lessonForcesDocsOnly.value,
  },
  {
    id: 'layout-main-view-docs',
    title: 'Layout: Docs Focus',
    handler: () => {
      setMainViewMode('docs')
    },
    icon: 'i-mynaui:book-open',
  },
  {
    id: 'layout-main-orientation',
    title: () => `Layout: Switch to ${ui.mainLayoutOrientation === 'horizontal' ? 'vertical' : 'horizontal'}`,
    handler: () => {
      ui.toggleMainLayoutOrientation()
    },
    icon: 'i-mynaui:rectangle',
  },
  {
    id: 'layout-main-reverse',
    title: () => `Layout: ${ui.mainLayoutReverse ? 'Normal' : 'Reverse'} Order`,
    handler: () => {
      ui.toggleMainLayoutReverse()
    },
    icon: 'i-mynaui:arrow-left-right',
  },
  {
    id: 'toggle-terminal',
    title: () => $t('terminal.toggle'),
    handler: () => {
      ui.toggleTerminal()
    },
    icon: 'i-carbon-terminal',
  },
  {
    id: 'toggle-console',
    title: () => 'Toggle Console',
    handler: () => {
      ui.toggleConsole()
    },
    icon: 'i-carbon-cics-program',
  },
  {
    id: 'toggle-preview',
    title: () => `${ui.showPreview ? 'Hide' : 'Show'} Preview`,
    handler: () => {
      ui.togglePreview()
    },
    icon: 'i-carbon-wikis',
  },
  {
    id: 'language-en',
    title: 'Change to English',
    handler: () => {
      i18n.setLocale('en')
    },
    icon: 'i-ph-translate-duotone',
    visible: () => {
      return i18n.locale.value !== 'en'
    },
  },
  {
    id: 'language-ja',
    title: '日本語に切り替える',
    handler: () => {
      i18n.setLocale('ja')
    },
    icon: 'i-ph-translate-duotone',
    visible: () => {
      return i18n.locale.value !== 'ja'
    },
  },
)
</script>

<template>
  <nav
    relative
    px4 py2 text-lg border="b base" flex="~ gap-1 items-center justify-between"
  >
    <div px4>
      <div text-xl text-primary font-bold font-mono dark:text-primary-dark>
        {{ $t('amoxtli-vue') }}
      </div>
      <div class="text-xs text-foreground/50 dark:text-foreground-dark/50">
        {{ $t('a-book-about-vue') }}
      </div>
    </div>
    <div class="mx-2 hidden max-w-2xl md:flex md:flex-1">
      <DocsNavigation class="min-w-0 w-full" />
    </div>
    <div
      flex="~ gap-1 items-center"
      :class="guide.embeddedDocs ? 'z-embedded-docs-raised' : ''"
    >
      <VDropdown :distance="6">
        <IconButton
          tooltip="Languages"
          tooltip-placement="bottom"
        >
          <div i-ph-translate-duotone text-xl />
        </IconButton>
        <template #popper>
          <div flex="~ col gap-y-1" p2>
            <button
              v-for="locale of i18n.locales.value" :key="locale.code"
              rounded px2 py1
              hover="bg-active"
              :class="locale.code === i18n.locale.value ? 'text-primary' : ''"
              @click="i18n.setLocale(locale.code)"
            >
              {{ locale.name }}
            </button>
          </div>
        </template>
      </VDropdown>
      <!-- <button
        rounded p2
        hover="bg-active"
        :title="$t('search')"
        @click="commands.isShown = true"
      >
        <div i-ph-magnifying-glass-duotone text-xl />
      </button> -->
      <!-- <button
        v-if="getPlaygroundStore()?.status === 'ready' && !!guide.features.download"
        rounded p2
        hover="bg-active"
        :title="$t('download-zip')"
        @click="downloadCurrentGuide()"
      >
        <div i-ph-download-duotone text-xl />
      </button> -->
      <!-- <VDropdown :distance="6">
        <button
          rounded p2
          hover="bg-active"
          title="Playground Information"
        >
          <div i-ph-info-duotone text-xl />
        </button>
        <template #popper>
          <div px5 py4 grid="~ gap-y-3 gap-x-2 cols-[max-content_1fr] items-center">
            <div i-ph-package-duotone text-xl />
            <NuxtLink :to="`${runtime.public.repoUrl}/commit/${runtime.public.gitSha}`" target="_blank" title="View on GitHub">
              <time :datetime="buildTime.toISOString()" :title="buildTime.toLocaleString()">
                <!- eslint-disable-next-line @intlify/vue-i18n/no-raw-text --
                {{ $t('built') }} {{ timeAgo }} (<code>{{ runtime.public.gitSha.slice(0, 5) }}</code>)
              </time>
            </NuxtLink>
          </div>
        </template>
      </VDropdown> -->
      <VDropdown :distance="6">
        <IconButton
          tooltip="Layout Options"
          tooltip-placement="bottom"
          :active="hasCustomLayoutApplied"
        >
          <div
            class="transition-all duration-200"
            text-xl
            :class="hasCustomLayoutApplied
              ? 'i-mynaui:layout-solid'
              : 'i-mynaui:layout hover:i-mynaui:layout-solid'"
          />
        </IconButton>
        <template #popper>
          <div class="layout-menu-panel" p2>
            <div class="layout-menu-list" flex="~ col gap-1">
              <IconButton
                v-if="!lessonForcesDocsOnly"
                class="layout-menu-item"
                tooltip="Code Focus"
                tooltip-placement="left"
                :class="isCodeFocusApplied ? 'text-primary bg-active/40 dark:text-primary-dark' : 'op60'"
                @click="toggleCodeOnly"
              >
                <div i-mynaui-code text-xl />
              </IconButton>
              <IconButton
                class="layout-menu-item"
                tooltip="Docs Focus"
                tooltip-placement="left"
                :class="isDocsFocusApplied ? 'text-primary bg-active/40 dark:text-primary-dark' : 'op60'"
                @click="toggleDocsOnly"
              >
                <div i-mynaui-book-open text-xl hover:i-mynaui-book-open-solid />
              </IconButton>
              <IconButton
                class="layout-menu-item op70"
                :tooltip="`Switch to ${ui.mainLayoutOrientation === 'horizontal' ? 'vertical' : 'horizontal'} layout`"
                tooltip-placement="left"
                @click="ui.toggleMainLayoutOrientation()"
              >
                <div
                  class="transition-transform duration-200"
                  text-xl
                  :class="ui.mainLayoutOrientation === 'horizontal'
                    ? 'i-mynaui:rectangle hover:i-mynaui:rectangle-solid'
                    : 'i-mynaui:rectangle-vertical hover:i-mynaui:rectangle-vertical-solid'"
                />
              </IconButton>
              <IconButton
                class="layout-menu-item"
                :tooltip="`${ui.mainLayoutReverse ? 'Normal' : 'Reverse'} ${ui.mainLayoutOrientation === 'horizontal' ? 'left/right' : 'top/bottom'} order`"
                tooltip-placement="left"
                :class="isReverseLayoutApplied ? 'text-primary bg-active/40 dark:text-primary-dark' : 'op70'"
                @click="ui.toggleMainLayoutReverse()"
              >
                <div
                  class="transition-transform duration-200"
                  text-xl
                  :class="ui.mainLayoutOrientation === 'horizontal'
                    ? 'i-mynaui:arrow-left-right hover:i-mynaui:arrow-left-right-solid'
                    : 'i-mynaui:arrow-up-down hover:i-mynaui:arrow-up-down-solid'"
                />
              </IconButton>
            </div>
          </div>
        </template>
      </VDropdown>
      <ColorSchemeToggle />
    </div>
  </nav>
  <div class="relative mt1 block h-10 md:hidden">
    <DocsNavigation />
  </div>
</template>
