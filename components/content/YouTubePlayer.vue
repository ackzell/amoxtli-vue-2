<script setup lang="ts">
const props = defineProps<{
  videoId: string
  title: string
  duration?: string
  class?: string
}>()

const canEmbed = import.meta.client
  ? 'credentialless' in HTMLIFrameElement.prototype
  : false
</script>

<template>
  <!-- credentialless iframe path -->
  <iframe
    v-if="canEmbed"
    :src="`https://www.youtube-nocookie.com/embed/${videoId}`"
    :title="title"
    width="560"
    height="315"
    allowfullscreen
    loading="lazy"
    credentialless
    style="border-radius: 8px; width: 100%; max-width: 560px; height: 315px; margin: 1rem auto;"
    class="shadow-sm transition-shadow duration-200 hover:shadow-md"
  />

  <!-- fallback card -->
  <div
    v-else
    :class="`
      flex items-center gap-4
      bg-bgr-50 dark:bg-bgr-800
      border border-bgr-100 dark:border-bgr-700
      rounded-lg
      p-6 my-4
      hover:shadow-sm
      transition-all duration-200
      max-w-2xl
      ${props.class}
    `"
  >
    <div i-mynaui-video-solid class="text-bgr-500 flex-shrink-0 h-16 w-16" />

    <div class="min-w-0">
      <h4 class="text-sm text-bgr-900 leading-tight font-semibold mb-1 dark:text-bgr-100">
        {{ title }}
      </h4>
      <p class="text-xs text-bgr-600 leading-snug mb-2 dark:text-bgr-300">
        <slot>{{ $t('yt-player.description-goes-here') }}</slot>
      </p>

      <div flex flex-1>
        <a
          :href="`https://www.youtube.com/watch?v=${videoId}`"
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs text-white font-medium px-3 py-1.5 rounded bg-red-600 no-underline inline-flex flex-shrink-0 transition-colors duration-200 items-center hover:bg-red-700"
        >
          <span>{{ $t('yt-player.watch') }}</span>
          <span v-if="duration" class="text-red-200 ml-1">{{ `(${duration})` }}</span>
        </a>
      </div>
    </div>
  </div>
</template>
