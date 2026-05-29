<script setup>
import { onMounted } from 'vue'

const helpAlbum = {
  id: '1ddea1f3-c2d3-4b7e-a8d8-b5108a7239a4',
  cover: 'Help.png',
  name: 'Help!',
  releaseDate: '6 August 1965',
}

// don't worry about this right now, just check the console output
onMounted(() => {
  console.log('When using mustaches:')
  console.log(document.querySelector('img.bad'))
})
</script>

<template>
  <h2>Rendering Images <small>With mustaches on attributes</small></h2>
  <img class="bad" src="{{assets/${helpAlbum.cover}}" alt="Album cover">

  <!-- uncomment if you want to fix the app -->
  <!-- <img class="bad" :src="`assets/${helpAlbum.cover}`" alt="Album cover"> -->
  {{ helpAlbum.name }}
</template>

<style>
h1 {
  color: #42b983;
}

ul {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

img {
  width: 2.5rem;
  height: 2.5rem;
}

small {
  margin-left: 0.5rem;
  font-size: 0.8rem;
}
</style>
