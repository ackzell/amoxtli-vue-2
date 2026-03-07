<script setup lang="ts">
import '@unocss/reset/tailwind.css'
import 'splitpanes/dist/splitpanes.css'
import './styles/base.css'
import './styles/prose.css'
import './styles/overrides.css'

useThemeTransition()
</script>

<template>
  <NuxtPage page-key="playground" />
</template>
