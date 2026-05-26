<script setup lang="ts">
import '@unocss/reset/tailwind.css'
import './styles/base.css'
import './styles/prose.css'
import './styles/overrides.css'
import './styles/twoslash.css'

useThemeTransition()
</script>

<template>
  <NuxtPage page-key="playground" />

  <div data-tooltip-content-target="globals" />
</template>
