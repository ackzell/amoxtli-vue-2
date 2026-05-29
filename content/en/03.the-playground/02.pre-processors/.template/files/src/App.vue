<script lang="ts">
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

<template lang="pug">
h1 {{ message }}

Version is: <code>{{ version }}</code>

div.box
  p Sass walked so CSS could run
</template>

<style lang="scss">
$surface-color: #42b983;
$foreground-color: whitesmoke;

@mixin center {
  display: flex;
  justify-content: center;
  align-items: center;
}

.box {
  width: 60%;
  height: 200px;
  background-color: $surface-color;
  color: $foreground-color;
  @include center;
}
</style>
