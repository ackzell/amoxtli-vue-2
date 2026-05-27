<script setup>
import { onMounted, ref, version } from 'vue'

const message = ref('Directives for conditional rendering')

const showAnswer = false

// don't worry about this right now, just check the console output
onMounted(() => {
  console.log(document.querySelector('.the-answer'))
  console.log(document.querySelector('.check-latest'))
  console.log(document.querySelector('.check-future'))
  console.log(document.querySelector('.check-deprecated'))
})
</script>

<template>
  <h1>{{ message }}</h1>

  Version is: <code>{{ version }}</code>

  <h2><code>v-show</code></h2>
  <p>
    The answer is
    <strong v-show="showAnswer" class="the-answer">{{ 40 + 2 }}</strong>
  </p>

  <p>
    {{
      version.startsWith('3.')
        ? 'Using the latest Vue!'
        : 'This version is no longer officially supported'
    }}
  </p>

  <h2><code>v-if</code>, <code>v-else-if</code> and <code>v-else</code></h2>
  <p v-if="version.startsWith('3.')" class="check-latest">
    <span class="latest-version">Using the latest Vue!</span>
  </p>

  <p v-else-if="version.startsWith('4.')" class="check-future">
    <span>Are you from the future?</span>
  </p>

  <p v-else class="check-deprecated">
    <span>This version is no longer officially supported</span>
  </p>
</template>

<style>
h1 {
  color: #42b983;
}

.latest-version {
  color: tomato;
}
</style>
