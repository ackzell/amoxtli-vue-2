<script setup lang="ts">
const { id } = defineProps<{ id: string }>()

// return the rendered HTML string from the hidden content node
function contentFn() {
  if (typeof document === 'undefined')
    return ''
  const el = document.querySelector(`[data-tooltip-id="${id}"]`)
  return el ? el.innerHTML : ''
}
</script>

<template>
  <VDropdown
    theme="guide-tooltip"
    :triggers="['hover']"
    :auto-hide="false"
    :popper-triggers="['hover']"
    :distance="6"
    :delay="{ show: 0, hide: 300 }"
    shown
  >
    <span class="cursor-help underline decoration-dotted">
      <slot />
    </span>

    <template #popper="{ hide }">
      <span
        class="tooltip-content"
        @click="(e) => {
          // Allow links to work normally
          if (e.target.tagName === 'A') {
            hide()
          }
        }"
        v-html="contentFn()"
      />
    </template>
  </VDropdown>
</template>

<style>
.v-popper.v-popper--theme-guide-tooltip {
  display: inline;
}

.dark .v-popper--theme-guide-tooltip {
  .v-popper__inner {
    background: turquoise;
    padding: 12px;
    border-radius: 6px;
    max-width: 400px;
  }
}

.dark .v-popper__popper .v-popper__arrow-outer {
  border-color: turquoise;
}

.v-popper--theme-guide-tooltip {
  .v-popper__inner {
    background: tomato;
    padding: 12px;
    border-radius: 6px;
    max-width: 400px;
  }
}

.v-popper__popper .v-popper__arrow-outer {
  border-color: tomato;
}

.tooltip-content {
  a {
    color: white;
    text-decoration: underline;

    &:hover {
      opacity: 0.8;
    }
  }

  blockquote {
    margin: 0.5em 0;
    padding-left: 3em;
    border-left: 3px solid rgba(255, 255, 255, 0.3);
  }
}
</style>
