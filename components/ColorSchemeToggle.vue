<script lang="ts" setup>
const colorMode = useColorMode()

function toggleMode() {
  colorMode.preference = colorMode.value === 'light' ? 'dark' : 'light'
}

addCommands(
  {
    id: 'toggle-color-mode',
    title: () => colorMode.value === 'light'
      ? $t('color-mode.to-dark')
      : $t('color-mode.to-light'),
    handler: toggleMode,
    icon: colorMode.value === 'light'
      ? 'i-mynaui-moon-solid'
      : 'i-mynaui-sun-solid',
  },
)
</script>

<template>
  <IconButton
    :tooltip="colorMode.value === 'light' ? $t('color-mode.to-dark') : $t('color-mode.to-light')"
    tooltip-placement="bottom"
    @click="toggleMode"
  >
    <div i-mynaui-sun-solid text-xl dark:i-mynaui-moon-solid />
  </IconButton>
</template>
