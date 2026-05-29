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
    class="callout-container [&>p]:leading-1.75em [&>p]:my-0" :class="[
      `bg-${variant.color}/8`,
      `border-${variant.color}`,
    ]"
    border="~ rounded-4xl"
    flex="~ gap-4 items-center"

    text-sm text-faded py4 pr2 relative
  >
    <div
      :class="[variant.icon, `text-${variant.color}`]"
      opacity-10 flex-shrink-0 h15 w15 left-1.5 absolute
    />

    <div
      :class="[variant.icon, `text-${variant.color}`]"
      mx6 flex-shrink-0 h6.5 w6.5
    />

    <div class="callout-text-container" w-full text-wrap>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.callout-container {
  corner-shape: squircle;
}

:deep(.callout-text-container) {
  p {
    --uno: 'line-height-loose';
  }

  code {
    text-wrap: wrap;
  }
}
</style>
