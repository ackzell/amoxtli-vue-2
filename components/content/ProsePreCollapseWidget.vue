<script setup lang="ts">
const props = withDefaults(defineProps<{
  expanded: boolean
  lineCount: number
  toggleable: boolean
  collapsedIconClass?: string
  expandedIconClass?: string
  widgetClass?: string
}>(), {
  collapsedIconClass: 'i-mynaui-chevron-right',
  expandedIconClass: 'i-mynaui-chevron-down',
  widgetClass: '',
})

defineEmits<{
  toggle: []
}>()

const label = computed(() => {
  return props.expanded
    ? `Hide ${props.lineCount} line${props.lineCount > 1 ? 's' : ''}`
    : `${props.lineCount} line${props.lineCount > 1 ? 's' : ''} collapsed`
})
</script>

<template>
  <button
    v-if="toggleable"
    type="button"
    class="ec-collapse-widget-inner ec-collapse-widget-trigger"
    :class="[widgetClass, { 'is-collapsed': !expanded }]"
    :aria-expanded="String(expanded) === 'true'"
    @click="$emit('toggle')"
  >
    <div
      class="shrink-0 h3.5 w3.5"
      :class="expanded ? expandedIconClass : collapsedIconClass"
      aria-hidden="true"
    />
    <span class="truncate">{{ label }}</span>
  </button>

  <div
    v-else
    class="ec-collapse-widget-inner"
    :class="[widgetClass, { 'is-collapsed': !expanded }]"
  >
    <div
      class="shrink-0 h3.5 w3.5"
      :class="expanded ? expandedIconClass : collapsedIconClass"
      aria-hidden="true"
    />
    <span class="truncate">{{ label }}</span>
  </div>
</template>

<style scoped>
.ec-collapse-widget-inner {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  width: 100%;
  min-height: 1.45rem;
  padding: 0.2rem 0.45rem;
  font-size: 0.75rem;
  line-height: 1.2;
  opacity: 0.75;
  border-radius: 0.25rem;
  border: 1px solid color-mix(in oklab, currentColor 10%, transparent);
  background: color-mix(in oklab, currentColor 7%, transparent);
}

.ec-collapse-widget-inner.is-collapsed {
  background: color-mix(in oklab, currentColor 10%, transparent);
}

.ec-collapse-widget-trigger {
  cursor: pointer;
}

.ec-collapse-widget-trigger:hover {
  opacity: 0.9;
}
</style>
