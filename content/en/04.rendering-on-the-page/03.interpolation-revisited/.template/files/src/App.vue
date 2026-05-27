<script setup>
import { ref, version } from 'vue'

const message = ref('Interpolation Revisited')
console.log('version:', version)

const rawHtmlContent = `<span>
    This is <strong>bold text</strong> rendered with <code>v-html</code>
  </span>`
</script>

<template>
  Version is: <code>{{ version }}</code>

  <h1 v-text="message" />

  <div v-html="rawHtmlContent" />
</template>

<style>
h1 {
  color: #42b983;
}

code {
  color: hotpink;
}
</style>
