<script>
import { ref, version } from 'vue'

export default {
  setup() {
    const message = ref('Hola playground!')
    console.log('version:', version)

    return {
      message,
      version,
    }
  },
}
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
