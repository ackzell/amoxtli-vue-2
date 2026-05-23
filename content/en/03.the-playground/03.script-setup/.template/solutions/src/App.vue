<script setup>
import { ref, version } from 'vue'

const message = ref('Hola playground script setup!')
console.log('version:', version)
</script>

<template>
  <h1>{{ message }}</h1>

  Version is: <code>{{ version }}</code>
</template>

<style>
h1 {
  color: #42b983;
}
</style>
