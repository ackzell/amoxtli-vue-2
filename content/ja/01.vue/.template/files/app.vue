<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <div style="padding: 2rem; text-align: center;">
    <h1>Vue 3 Playground</h1>
    <p>Count is: {{ count }}</p>
    <button type="button" @click="count++">
      Increment
    </button>
  </div>
</template>

<style scoped>
button {
  padding: 0.5rem 1rem;
  font-size: 1rem;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

button:hover {
  background: #359268;
}
</style>
