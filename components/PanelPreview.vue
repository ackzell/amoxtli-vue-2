<script setup lang="ts">
const preview = usePreviewStore()

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
      inner.value.iframe.src = preview.url
    }
    inputUrl.value = preview.location.fullPath
  }
}

function navigate() {
  preview.location.fullPath = inputUrl.value
  preview.updateUrl()
  const activeElement = document.activeElement
  if (activeElement instanceof HTMLElement)
    activeElement.blur()
}
</script>

<template>
  <div h-full class="grid grid-rows-[min-content_1fr]">
    <div
      data-dock-drag-handle="true"
      draggable="true"
      flex="~ items-center gap-2"
      border="b base dashed" bg-faded pl1 pr2
    >
      <div
        flex="~ auto gap-2 items-center"
        border="~ base"
        m1.5 rounded bg-faded px2 py0.5 tracking-wide
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
              w-full flex-1 bg-transparent focus:outline-none
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
    </div>
    <div relative h-full w-full>
      <PanelPreviewLoading />
      <PanelPreviewClient ref="inner" />
    </div>
  </div>
</template>
