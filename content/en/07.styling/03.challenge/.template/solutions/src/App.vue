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

function selectColor(color) {
  selected.value = color
}

function reset() {
  selected.value = null
}
</script>

<template>
  <div class="color-picker">
    <div
      class="preview"
      data-testid="preview"
      :style="{ backgroundColor: selected ? selected.hex : 'transparent' }"
    />

    <p class="selected-name" data-testid="selected-name">
      {{ selected ? selected.name : '' }}
    </p>

    <ul class="swatch-list">
      <li v-for="color in colors" :key="color.name">
        <button
          type="button"
          class="swatch"
          data-testid="swatch"
          :aria-label="color.name"
          :aria-pressed="selected?.name === color.name"
          :class="{ selected: selected?.name === color.name }"
          :style="{ backgroundColor: color.hex }"
          :disabled="selected?.name === color.name"
          @click="selectColor(color)"
        />
      </li>
    </ul>

    <button
      type="button"
      class="reset"
      data-testid="reset"
      :disabled="!selected"
      @click="reset"
    >
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

.selected-name {
  min-height: 1.5rem;
  font-weight: 600;
}

.swatch-list {
  display: flex;
  gap: 0.5rem;
  padding: 0;
  list-style: none;
}

.swatch {
  width: 3rem;
  height: 3rem;
  border: 2px solid transparent;
  border-radius: 50%;
  cursor: pointer;
}

.swatch.selected {
  border-color: #111827;
  box-shadow:
    0 0 0 3px #fff,
    0 0 0 5px #111827;
}

.swatch:disabled {
  cursor: not-allowed;
}

.reset {
  align-self: flex-start;
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.reset:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
