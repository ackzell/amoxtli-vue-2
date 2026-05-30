<script setup>
import { onMounted } from 'vue'

const chatMessages = [
  {
    id: 'b79b7c8c-f265-4e78-91f6-8d30ee05636c',
    message: 'Are you coming to the party?',
    sender: 'they',
    reactions: [],
  },
  {
    id: '6c84f6c1-dab1-4994-a95b-fd08dfd67817',
    message: 'No, sorry. I am learning Vue',
    sender: 'me',
    reactions: ['😯', '🤓', '👏'],
  },
  {
    id: 'a096ff10-6dc0-4793-83c1-7073cb2201e1',
    message: 'I\'ve heard that\'s also pretty fun!',
    sender: 'they',
    reactions: ['💚'],
  },
]

// don't worry about this right now, just check the console output
onMounted(() => {
  console.log(document.querySelectorAll('.they')[0])
  console.log(document.querySelector('.me'))
  console.log(document.querySelectorAll('.they')[1])
})
</script>

<template>
  <h1>More on lists</h1>
  <h2>Nested lists</h2>

  <ul class="chat-messages">
    <li v-for="entry of chatMessages" :key="entry.id" :class="entry.sender">
      {{ entry.message }}
      <ul class="message-reactions">
        <li v-for="(reaction, index) in entry.reactions" :key="index">
          {{ reaction }}
        </li>
      </ul>
    </li>
  </ul>
</template>

<style>
:root {
  --neutral: oklch(0.56 0 0);
  --highlight: #42b983;
}

h1 {
  color: var(--highlight);
}

li {
  list-style: none;
}

ul.chat-messages {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  margin: 0 auto;
  width: 55%;
  border: 1px dotted var(--highlight);
  padding: 2rem 1rem;
  border-radius: 0.6rem;

  & > li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border: 1px solid;
    padding: 0.7rem;
    border-radius: 0.25rem;
    position: relative;
  }

  .they {
    align-self: flex-start;
    color: var(--neutral);
  }

  .me {
    align-self: flex-end;
    color: var(--highlight);
  }
}

ul.message-reactions {
  position: absolute;
  top: calc(100% - 0.6rem);
  right: 0;

  display: flex;
  li {
    border-radius: 0.2rem;
    padding: 0.1rem;
  }
}

small {
  margin-left: 0.5rem;
  font-size: 0.8rem;
}
</style>
