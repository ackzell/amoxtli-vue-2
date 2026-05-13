<script setup lang="ts">
const props = defineProps<{
  type?: 'success' | 'info' | 'challenge' | 'tip' | 'warning'
}>()

const variants = {
  success: {
    icon: 'i-mynaui-check-hexagon-solid',
    color: 'positive',
  },
  info: {
    icon: 'i-mynaui-info-hexagon-solid',
    color: 'info',
  },
  challenge: {
    icon: 'i-mynaui-lightning-solid',
    color: 'challenge',
  },
  tip: {
    icon: 'i-mynaui-sparkles-solid',
    color: 'tip',
  },
  warning: {
    icon: 'i-mynaui-danger-hexagon-solid',
    color: 'warning',
  },
}

const variant = computed(() => {
  return variants[props.type ?? 'info']
})
</script>

<template>
  <div
    class="callout-container [&>p]:my-0 [&>p]:leading-1.75em" :class="[
      `bg-${variant.color}/8`,
      `border-${variant.color}`,
    ]"
    border="~ rounded-xl"
    flex="~ gap-4 items-center justify-between"

    relative p3 px4 text-sm text-faded
  >
    <div
      :class="[variant.icon, `text-${variant.color}`]"
      absolute left-5.5 h15 w15 flex-shrink-0 opacity-10
    />

    <div
      :class="[variant.icon, `text-${variant.color}`]"
      mx6 h6.5 w6.5 flex-shrink-0
    />

    <slot />
  </div>
</template>

<style scoped>
.callout-container {
  corner-shape: squircle;
}
</style>
