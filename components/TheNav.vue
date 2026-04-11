<script setup lang="ts">
const ui = useUiState()
const play = usePlaygroundStore()
const guide = useGuideStore()

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
        rounded p2
        :title="$t('terminal.toggle')"
        hover="bg-active"
        :class="ui.showTerminal ? '' : 'op50'"
        @click="ui.toggleTerminal()"
      >
        <div i-ph-terminal-window-duotone text-2xl />
      </button>
      <button
        rounded p2
        title="Toggle Console"
        hover="bg-active"
        :class="ui.showConsole ? '' : 'op50'"
        @click="ui.toggleConsole()"
      >
        <div i-ph-terminal-duotone text-2xl />
      </button>
      <ColorSchemeToggle />
    </div>
  </nav>
  <div class="mb6 mt2 block md:hidden">
    <DocsNavigation />
  </div>
</template>
