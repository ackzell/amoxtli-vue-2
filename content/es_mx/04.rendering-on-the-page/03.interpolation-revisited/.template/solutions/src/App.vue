<script setup>
import { ref, version } from 'vue'

const message = ref('Interpolation Revisited')
console.log('version:', version)
</script>

<template>
  Version is: <code>{{ version }}</code>

  <h1 v-text="message">
    This text will be replaced {{ message }}
  </h1>
</template>

<style>
h1 {
  color: #42b983;
}
</style>
