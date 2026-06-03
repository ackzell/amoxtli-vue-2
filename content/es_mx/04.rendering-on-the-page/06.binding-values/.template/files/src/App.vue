<script setup>
import { onMounted } from 'vue'

const discography = [
  {
    id: '4590436b-1c7d-415e-a2fd-2e15eeee05d8',
    cover: 'PleasePleaseMe.png',
    name: 'Please Please Me',
    releaseDate: '22 March 1963',
  },
  {
    id: '1ddea1f3-c2d3-4b7e-a8d8-b5108a7239a4',
    cover: 'Help.png',
    name: 'Help!',
    releaseDate: '6 August 1965',
  },
  {
    id: 'e7d06694-e683-4670-a890-51c89bf2693b',
    cover: 'WhiteAlbum.jpg',
    name: 'White Album',
    releaseDate: '22 March 1963',
  },
  {
    id: '8f870109-34cd-47cc-b490-79a96713bf48',
    cover: 'SgtPeppers.jpg',
    name: 'Sgt. Pepper\'s Lonely Hearts Club Band',
    releaseDate: '26 May 1967',
  },
  {
    id: '61f39216-0c9e-41cd-9144-055206280c62',
    cover: 'MagicalMysteryTour.jpg',
    name: 'Magical Mystery Tour',
    releaseDate: '27 November 1967',
  },
]

// don't worry about this right now, just check the console output
onMounted(() => {
  console.log('When using mustaches:')
  console.log(document.querySelector('img.bad'))

  console.log('When using v-bind:')
  console.log(document.querySelector('img.good'))
})
</script>

<template>
  <h1>Binding Values</h1>

  <h2>Rendering Images <small>With mustaches on attributes</small></h2>
  <ul>
    <li v-for="album in discography" :key="album.id">
      <img class="bad" src="{{album.cover}}" alt="Album cover">
      {{ album.name }}
    </li>
  </ul>

  <h2>Rendering Images <small>Using `v-bind`</small></h2>
  <ul>
    <li v-for="album in discography" :key="album.id">
      <img
        class="good"

        :src="`assets/${album.cover}`"
        alt="Album cover"
      >
      {{ album.name }}
    </li>
  </ul>
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
