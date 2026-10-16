<script setup>
import { ref } from 'vue'

const colors = [
  { name: 'Coral', hex: '#ff6b6b' },
  { name: 'Amber', hex: '#ffa94d' },
  { name: 'Lime', hex: '#69db7c' },
  { name: 'Sky', hex: '#4dabf7' },
  { name: 'Violet', hex: '#b197fc' },
]

const selected = ref(null)
</script>

<template>
  <div class="color-picker">
    <div class="preview" data-testid="preview" />

    <p class="selected-name" data-testid="selected-name" />

    <ul class="swatch-list">
      <li>
        <button data-testid="swatch" aria-label="">
          swatch
        </button>
      </li>
    </ul>

    <button data-testid="reset">
      Reset
    </button>
  </div>
</template>

<style>
.color-picker {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 22rem;
  margin: 2rem auto;
  font-family: sans-serif;
}

.preview {
  height: 8rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
}

.swatch-list {
  display: flex;
  gap: 0.5rem;
  padding: 0;
  list-style: none;
}
</style>
