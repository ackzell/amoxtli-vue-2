<script setup>
const theBeatles = [
  {
    firstName: 'John',
    lastName: 'Lennon',
  },
  {
    firstName: 'Paul',
    lastName: 'McCartney',
  },
  {
    firstName: 'George',
    lastName: 'Harrison',
  },
  {
    firstName: 'Ringo',
    lastName: 'Star',
  },
]
</script>

<template>
  <h1>Rendering Lists</h1>

  <h2>Rendering the array "as is"</h2>
  {{ theBeatles }}

  <h2>
    <code>v-for</code>
    <small>Rendering each element in the array</small>
  </h2>
  <ul>
    <li v-for="beatle in theBeatles">
      {{ beatle }}
    </li>
  </ul>

  <h2>
    <code>v-for</code>
    <small>Extracting the data from each element and rendering</small>
  </h2>
  <ul>
    <li v-for="beatle in theBeatles">
      {{ beatle.firstName }} {{ beatle.lastName }}
    </li>
  </ul>
</template>

<style>
h1 {
  color: #42b983;
}

small {
  margin-left: 0.5rem;
  font-size: 0.8rem;
}
</style>
