<script setup lang="ts">
const ui = useUiState()
const play = usePlaygroundStore()
const guide = useGuideStore()

const lessonForcesDocsOnly = computed(() => guide.currentGuide?.layout?.docsOnly === true)
const effectiveMainViewMode = computed(() => {
  if (lessonForcesDocsOnly.value)
    return 'docs'
  return ui.mainViewMode
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
  if (!play.webcontainer)
    throw new Error('No webcontainer found')

  if (play.status !== 'ready')
    throw new Error('Playground is not ready')

  if (!guide.features.download)
    throw new Error(`Download feature is disabled for guide ${guide.currentGuide}`)

  downloadZip(play.webcontainer, guide.ignoredFiles)
}

const i18n = useI18n()

addCommands(
  {
    id: 'download-zip',
    title: () => $t('download-zip'),
    visible: () => {
      return play.status === 'ready' && guide.features.download !== false
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
    icon: 'i-ph-columns-duotone',
  },
  {
    id: 'layout-main-view-code',
    title: 'Layout: Code Focus',
    handler: () => {
      setMainViewMode('code')
    },
    icon: 'i-ph-code-duotone',
    visible: () => !lessonForcesDocsOnly.value,
  },
  {
    id: 'layout-main-view-docs',
    title: 'Layout: Docs Focus',
    handler: () => {
      setMainViewMode('docs')
    },
    icon: 'i-ph-book-open-text-duotone',
  },
  {
    id: 'layout-main-orientation',
    title: () => `Layout: Switch to ${ui.mainLayoutOrientation === 'horizontal' ? 'vertical' : 'horizontal'}`,
    handler: () => {
      ui.toggleMainLayoutOrientation()
    },
    icon: 'i-ph-layout-duotone',
  },
  {
    id: 'layout-main-reverse',
    title: () => `Layout: ${ui.mainLayoutReverse ? 'Normal' : 'Reverse'} Order`,
    handler: () => {
      ui.toggleMainLayoutReverse()
    },
    icon: 'i-ph-arrows-left-right-duotone',
  },
  {
    id: 'toggle-terminal',
    title: () => $t('terminal.toggle'),
    handler: () => {
      ui.toggleTerminal()
    },
    icon: 'i-ph-terminal-window-duotone',
  },
  {
    id: 'toggle-console',
    title: () => 'Toggle Console',
    handler: () => {
      ui.toggleConsole()
    },
    icon: 'i-ph-terminal-duotone',
  },
  {
    id: 'toggle-preview',
    title: () => `${ui.showPreview ? 'Hide' : 'Show'} Preview`,
    handler: () => {
      ui.togglePreview()
    },
    icon: 'i-ph-monitor-play-duotone',
  },
  {
    id: 'language-en',
    title: 'Change to English',
    handler: () => {
      i18n.setLocale('en')
    },
    icon: 'i-ph-globe-duotone',
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
    icon: 'i-ph-globe-duotone',
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
        <button
          rounded p2
          hover="bg-active"
          title="Languages"
        >
          <div i-ph-translate-duotone text-2xl />
        </button>
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
        <div i-ph-magnifying-glass-duotone text-2xl />
      </button> -->
      <!-- <button
        v-if="play.status === 'ready' && !!guide.features.download"
        rounded p2
        hover="bg-active"
        :title="$t('download-zip')"
        @click="downloadCurrentGuide()"
      >
        <div i-ph-download-duotone text-2xl />
      </button> -->
      <!-- <VDropdown :distance="6">
        <button
          rounded p2
          hover="bg-active"
          title="Playground Information"
        >
          <div i-ph-info-duotone text-2xl />
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
      <button
        v-if="!lessonForcesDocsOnly"
        rounded p2
        title="Code Focus"
        hover="bg-active"
        :class="effectiveMainViewMode === 'code' ? '' : 'op50'"
        @click="toggleCodeOnly"
      >
        <div i-ph-code-duotone text-2xl />
      </button>
      <button
        rounded p2
        title="Docs Focus"
        hover="bg-active"
        :class="effectiveMainViewMode === 'docs' ? '' : 'op50'"
        @click="toggleDocsOnly"
      >
        <div i-ph-book-open-text-duotone text-2xl />
      </button>
      <button
        rounded p2
        :title="`Switch to ${ui.mainLayoutOrientation === 'horizontal' ? 'vertical' : 'horizontal'} layout`"
        hover="bg-active"
        @click="ui.toggleMainLayoutOrientation()"
      >
        <div
          class="transition-transform duration-200"
          text-2xl
          :class="ui.mainLayoutOrientation === 'horizontal'
            ? 'i-ph-columns-duotone rotate-0'
            : 'i-ph-columns-duotone rotate-90'"
        />
      </button>
      <button
        rounded p2
        :title="`${ui.mainLayoutReverse ? 'Normal' : 'Reverse'} ${ui.mainLayoutOrientation === 'horizontal' ? 'left/right' : 'top/bottom'} order`"
        hover="bg-active"
        :class="ui.mainLayoutReverse ? '' : 'op70'"
        @click="ui.toggleMainLayoutReverse()"
      >
        <div
          class="transition-transform duration-200"
          text-2xl
          :class="ui.mainLayoutOrientation === 'horizontal'
            ? 'i-ph-arrows-left-right-duotone rotate-0'
            : 'i-ph-arrows-left-right-duotone rotate-90'"
        />
      </button>
      <ColorSchemeToggle />
    </div>
  </nav>
  <div class="mb6 mt2 block md:hidden">
    <DocsNavigation />
  </div>
</template>
