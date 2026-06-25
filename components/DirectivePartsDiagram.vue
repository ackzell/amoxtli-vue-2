<script setup lang="ts">
import { ref } from 'vue'

const hovering = ref('')
let leaveTimer: ReturnType<typeof setTimeout> | null = null

function enter(parts: string) {
  if (leaveTimer)
    clearTimeout(leaveTimer)
  leaveTimer = null
  hovering.value = parts
}

function leave() {
  leaveTimer = setTimeout(() => {
    hovering.value = ''
    leaveTimer = null
  }, 80)
}
</script>

<template>
  <!-- eslint-disable @intlify/vue-i18n/no-raw-text -->
  <div class="directive-parts-root" flex="~ col items-center justify-center">
    <div
      text="~ md lg:xl"
      flex="~ col gap-2"
      font-code
    >
      <div class="directive-line" @mouseenter="enter('name argument modifiers value')" @mouseleave="leave">
        <span class="name">v-on</span>:<span class="argument">submit</span>.<span class="modifiers">prevent</span>="<span class="value">handleSubmit</span>"
      </div>

      <div class="directive-line" @mouseenter="enter('argument modifiers value')" @mouseleave="leave">
        <span class="name" />@<span class="argument">submit</span>.<span class="modifiers">prevent</span>="<span class="value">handleSubmit</span>"
      </div>

      <div class="directive-line" @mouseenter="enter('argument value')" @mouseleave="leave">
        <span class="name" />:<span class="argument">id</span>="<span class="value">player.id</span>"
      </div>

      <div class="directive-line" @mouseenter="enter('argument modifiers')" @mouseleave="leave">
        <span class="name" />@<span class="argument">click</span>.<span class="modifiers">stop</span>
      </div>

      <div class="directive-line" @mouseenter="enter('name value')" @mouseleave="leave">
        <span class="name">v-for</span>="<span class="value">{ child, idx } in splitChildrenWithIndex(node)</span>"
      </div>

      <div class="directive-line" @mouseenter="enter('name argument value')" @mouseleave="leave">
        <span class="name">v-bind</span>:<span class="argument">id</span>="<span class="value">player.id</span>"
      </div>

      <div class="directive-line" @mouseenter="enter('argument value')" @mouseleave="leave">
        <span class="name" />:<span class="argument">id</span>="<span class="value">player.id</span>"
      </div>

      <div class="directive-line" @mouseenter="enter('name value')" @mouseleave="leave">
        <span class="name">v-text</span>="<span class="value">message</span>"
      </div>

      <div class="directive-line" @mouseenter="enter('argument modifiers')" @mouseleave="leave">
        <span class="name" />@<span class="argument">click</span>.<span class="modifiers">stop</span>
      </div>

      <div class="directive-line" @mouseenter="enter('name value')" @mouseleave="leave">
        <span class="name">v-if</span>="<span class="value">resolved.children?.length</span>"
      </div>
    </div>
  </div>
  <div class="legend-container" flex="~ wrap gap-2">
    <div class="name" :class="{ dim: !hovering.includes('name') }">
      <h2>
        Name
      </h2>
      <p>
        Starts with `v-`. May be omitted when using shorthands
      </p>
    </div>

    <div class="argument" :class="{ dim: !hovering.includes('argument') }">
      <h2>
        Argument
      </h2>
      <p>
        Follows the colon or shorthand symbol
      </p>
    </div>

    <div class="modifiers" :class="{ dim: !hovering.includes('modifiers') }">
      <h2>
        Modifiers
      </h2>
      <p>
        Denoted by the leading dot
      </p>
    </div>

    <div class="value" :class="{ dim: !hovering.includes('value') }">
      <h2>
        Value
      </h2>
      <p>
        Interpreted as JS expressions
      </p>
    </div>
  </div>
</template>

<style scoped>
.legend-container {
  div {
    flex: 1;
    min-width: 150px;

    h2 {
      margin-top: 1rem;
    }
  }
}

.legend-container .name {
  color: var(--colors-primary-500);
}
.legend-container .argument {
  color: var(--colors-info-400);
}
.legend-container .modifiers {
  color: var(--colors-tip-400);
}
.legend-container .value {
  color: var(--colors-primary-dark-300);
}

.legend-container .dim {
  opacity: 0.45;
}

.legend-container div {
  transition: opacity 0.2s;
}

.directive-line {
  cursor: default;

  span {
    transition: color 200ms ease-out;
  }
}

.directive-line:hover .name {
  color: var(--colors-primary-500);
}
.directive-line:hover .argument {
  color: var(--colors-info-400);
}
.directive-line:hover .modifiers {
  color: var(--colors-tip-400);
}
.directive-line:hover .value {
  color: var(--colors-primary-dark-300);
}
</style>
