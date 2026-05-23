<script>
import { ref, version } from 'vue'

export default {
  setup() {
    const message = ref('Hola playground for Vue!')
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

  <div class="box">
    <p>I am centered!</p>
  </div>
</template>

<style>
:root {
  --surface-color: #42b983;
  --foreground-color: whitesmoke;
}

body {
  padding: 1rem;
}

.box {
  width: 60%;
  height: 200px;
  background-color: var(--surface-color);
  color: var(--foreground-color);
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
