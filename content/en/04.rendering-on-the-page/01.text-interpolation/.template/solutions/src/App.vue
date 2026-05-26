<script setup>
import { ref, version } from 'vue'

const message = ref('Interpolation')
console.log('version:', version)
</script>

<template>
  <h1>{{ message }}</h1>

  <h1>{{ message.toUpperCase() }}</h1>

  Version is: <code>{{ version }}</code>

  <p>The answer is {{ 40 + 2 }}</p>

  <p>Random number: {{ Math.random() }}</p>

  <p>Current date: {{ new Date().toLocaleDateString() }}</p>

  <p>
    {{
      version.startsWith('3.')
        ? 'Using the latest Vue!'
        : 'This version is no longer officially supported'
    }}
  </p>

  {{ if (ok) { return message } }}
</template>

<style>
h1 {
  color: #42b983;
}
</style>
