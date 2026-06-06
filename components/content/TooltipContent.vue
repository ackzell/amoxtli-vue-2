<script setup lang="ts">
import { onMounted, ref } from 'vue'

const { id } = defineProps<{ id: string }>()
const el = ref<HTMLElement | null>(null)

onMounted(() => {
  const target = document.querySelector<HTMLElement>(
    `[data-tooltip-content-target='${id}']`,
  )
  if (target && el.value) {
    target.replaceChildren(...Array.from(el.value.childNodes))
  }
})
</script>

<template>
  <span ref="el" display-none>
    <div text-sm p2 rounded-md bg-bgr-50 dark:bg-bgr-900>
      <slot />
    </div>
  </span>
</template>
