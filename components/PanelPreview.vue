<script setup lang="ts">
const preview = usePreviewStore()
const guide = useGuideStore()
const colorMode = useColorMode()

// Dynamic import to prevent playground store access when not rendered
const PanelPreviewLoading = defineAsyncComponent({
  loader: () => import('./PanelPreviewLoading.vue'),
  loadingComponent: { template: '<div />' },
  delay: 200,
  timeout: 3000,
})
const PanelPreviewClient = defineAsyncComponent({
  loader: () => import('./PanelPreviewClient.client.vue'),
  loadingComponent: { template: '<div />' },
  delay: 200,
  timeout: 3000,
})

const inputUrl = ref<string>('')
let retryTimer: ReturnType<typeof setTimeout> | null = null
let retryCount = 0
const inner = ref<{ iframe?: HTMLIFrameElement | undefined }>()

// auto update inputUrl when location value changed
syncRef(
  computed(() => preview.location.fullPath),
  inputUrl,
  { direction: 'ltr' },
)

function refreshIframe(force = false) {
  preview.updateUrl()
  if (preview.url && inner.value?.iframe) {
    if (force || inner.value.iframe.src !== preview.url) {
      const colorMode = useColorMode()
      const url = new URL(preview.url)
      url.searchParams.set('dark', colorMode.value === 'dark' ? 'true' : 'false')
      inner.value.iframe.src = url.toString()
    }
    inputUrl.value = preview.location.fullPath
  }
}

function startRetryTimer() {
  if (retryCount >= 2) {
    preview.connecting = false
    return
  }
  clearTimeout(retryTimer!)
  preview.connecting = true
  preview.iframeReady = false
  retryCount++
  retryTimer = setTimeout(() => {
    if (!preview.iframeReady && preview.url) {
      refreshIframe(true)
      startRetryTimer()
    }
  }, 5000)
}

watch(() => preview.url, (newUrl) => {
  retryCount = 0
  if (newUrl) {
    startRetryTimer()
  }
})

watch(() => preview.iframeReady, (ready) => {
  if (ready) {
    clearTimeout(retryTimer!)
    preview.connecting = false
  }
})

onBeforeUnmount(() => clearTimeout(retryTimer!))

function navigate() {
  preview.location.fullPath = inputUrl.value
  preview.updateUrl()
  const activeElement = document.activeElement
  if (activeElement instanceof HTMLElement)
    activeElement.blur()
}

watch(
  () => [guide.currentGuide, guide.showingSolution],
  () => {
    refreshIframe(true)
  },
)

watch(
  () => colorMode.value,
  () => refreshIframe(true),
)
</script>

<template>
  <div h-full class="grid grid-rows-[min-content_1fr]">
    <div
      data-dock-drag-handle="true"
      draggable="true"
      flex="~ items-center gap-2"
      border="b base dashed" pl1 pr2
      bg="dark:bgr-dark bgr-50"
      class="active:cursor-grabbing"
    >
      <div
        flex="~ auto gap-2 items-center"
        border="~ base"
        tracking-wide m1.5 px2 py0.5 rounded bg-faded
      >
        <div i-carbon-wikis />
        <span text-sm op50>{{ $t('preview') }}</span>
        <div
          text-sm
          flex="~ items-center justify-center auto"
          :class="{
            'pointer-events-none': !preview.url,
          }"
        >
          <form w-full @submit.prevent="navigate">
            <input
              v-model="inputUrl" type="text"
              bg-transparent flex-1 w-full focus:outline-none
            >
          </form>
        </div>
      </div>
      <IconButton
        tooltip="Refresh Preview"
        tooltip-placement="bottom"
        padding="sm"
        @click="refreshIframe(true)"
      >
        <div i-carbon-rotate-360 text-sm />
      </IconButton>
      <ClientOnly>
        <VDropdown :distance="6">
          <IconButton
            tooltip="Playground Information"
            tooltip-placement="bottom"
            padding="sm"
          >
            <div i-carbon-information text-sm />
          </IconButton>
          <template #popper>
            <div px5 py4 grid="~ gap-y-3 gap-x-2 cols-[max-content_1fr] items-center">
              <div i-uim-vuejs text-xl />
              <div flex="~ gap-2 items-center">
                <!-- eslint-disable-next-line @intlify/vue-i18n/no-raw-text -->
                {{ $t('vueVersion') }}:
                <div
                  v-if="!preview.clientInfo?.versionVue"
                  i-svg-spinners-90-ring-with-bg
                />
                <!-- eslint-disable-next-line @intlify/vue-i18n/no-raw-text -->
                <code v-else>
                  v{{ preview.clientInfo.versionVue }}
                </code>
              </div>
            </div>
          </template>
        </VDropdown>
      </ClientOnly>
    </div>
    <div h-full w-full relative>
      <PanelPreviewClient ref="inner" />
      <PanelPreviewLoading />
    </div>
  </div>
</template>
