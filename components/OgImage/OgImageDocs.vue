<!--
  Amoxtli-neutral social card. Originally vendored from nuxt.com's
  `components/OgImage/OgImageDocs.vue`; the Nuxt logo and brand green were
  replaced with Amoxtli Vue's own palette and a generic "book" (amoxtli) mark so
  the card does not imply any affiliation with Nuxt.

  Palette values mirror `uno.config.ts` (primary / bgr / foreground tokens).
-->
<script lang="ts" setup>
defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  title: string
  description: string
  headline?: string
  colorMode?: 'light' | 'dark'
}>(), {
  headline: '',
  colorMode: 'dark',
})

const palettes = {
  dark: {
    bg: '#0B0C07',
    glow: '#E4007C',
    accent: '#FF61B4',
    title: '#FFFFFF',
    description: '#BDCCDB',
    mark: '#ECA342',
    ring: '#E4007C',
  },
  light: {
    bg: '#F5F5F5',
    glow: '#ECA342',
    accent: '#AA6500',
    title: '#324A62',
    description: '#5B6B7A',
    mark: '#ECA342',
    ring: '#ECA342',
  },
} as const

const c = computed(() => palettes[props.colorMode ?? 'dark'])
</script>

<template>
  <div
    class="flex flex-col h-full w-full justify-center"
    :style="{ backgroundColor: c.bg }"
  >
    <!-- Soft brand glow, top-right (radial gradient, no bitmap filters). -->
    <svg
      class="right-0 top-0 absolute"
      width="629"
      height="593"
      viewBox="0 0 629 593"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="470" cy="40" r="420" fill="url(#amv-glow)" />
      <defs>
        <radialGradient
          id="amv-glow"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(470 40) scale(420)"
        >
          <stop :stop-color="c.glow" stop-opacity="0.8" />
          <stop offset="1" :stop-color="c.glow" stop-opacity="0" />
        </radialGradient>
      </defs>
    </svg>

    <div class="pl-[100px] w-[700px]">
      <p
        v-if="headline"
        class="text-[24px] font-semibold mb-4 uppercase"
        :style="{ color: c.accent }"
      >
        {{ headline }}
      </p>
      <h1
        class="text-[75px] font-semibold m-0 mb-4 flex items-center"
        :style="{ color: c.title }"
      >
        <span>{{ title }}</span>
      </h1>
      <p class="text-[32px] leading-tight" :style="{ color: c.description }">
        {{ description.slice(0, 200) }}
      </p>
    </div>

    <!-- Abstract book mark (amoxtli = "book" in Nahuatl). -->
    <svg
      class="right-[110px] top-[170px] absolute"
      width="300"
      height="300"
      viewBox="0 0 300 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="150" cy="150" r="140" :stroke="c.ring" stroke-width="2" stroke-opacity="0.25" />
      <circle cx="150" cy="150" r="112" :stroke="c.ring" stroke-width="2" stroke-opacity="0.45" />
      <path
        d="M150 92C122 72 82 66 48 74V214C82 206 122 212 150 232C178 212 218 206 252 214V74C218 66 178 72 150 92Z"
        :fill="c.mark"
        fill-opacity="0.18"
        :stroke="c.mark"
        stroke-width="7"
        stroke-linejoin="round"
      />
      <path d="M150 92V232" :stroke="c.mark" stroke-width="7" stroke-linecap="round" />
      <path
        d="M86 106C104 104 124 108 138 118"
        :stroke="c.mark"
        stroke-width="6"
        stroke-linecap="round"
        stroke-opacity="0.7"
      />
      <path
        d="M214 106C196 104 176 108 162 118"
        :stroke="c.mark"
        stroke-width="6"
        stroke-linecap="round"
        stroke-opacity="0.7"
      />
    </svg>
  </div>
</template>
