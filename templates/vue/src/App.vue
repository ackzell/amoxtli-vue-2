<script setup lang="ts">
import { onMounted, ref } from 'vue'

const count = ref(0)
console.log('hello hello hello')

console.table({
  a: 1,
  b: 2,
})

onMounted(() => {
  console.log(document.getElementById('myEl'))
})
</script>

<template>
  <div style="padding: 2rem; text-align: center;">
    <h1 id="myEl">
      Vue 3 Playground
    </h1>
    <p>Count: {{ count }}</p>
    <button @click="count++">
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
}

button:hover {
  background: #359268;
}
</style>
