<script lang="ts" setup>
const props = withDefaults(defineProps<{
  /**
   * `dropdown` renders the popper menu used in the nav.
   * `inline` renders a flat segmented control for modal surfaces, where a
   * floating-vue popper would be teleported outside the dialog and become
   * unclickable (Reka disables pointer events outside the modal).
   */
  variant?: 'dropdown' | 'inline'
}>(), {
  variant: 'dropdown',
})

const colorMode = useColorMode()

function toggleMode() {
  colorMode.preference = colorMode.value === 'light' ? 'dark' : 'light'
}

function setMode(mode: 'system' | 'light' | 'dark') {
  colorMode.preference = mode
}

const modeOptions = [
  { mode: 'light', icon: 'i-mynaui-sun-solid', labelKey: 'color-mode.light' },
  { mode: 'dark', icon: 'i-mynaui-moon-solid', labelKey: 'color-mode.dark' },
  { mode: 'system', icon: 'i-mynaui-monitor', labelKey: 'color-mode.system' },
] as const

const triggerIcon = computed(() => {
  if (colorMode.preference === 'system')
    return 'i-mynaui-monitor'
  return colorMode.value === 'dark' ? 'i-mynaui-moon-solid' : 'i-mynaui-sun-solid'
})

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
  {
    id: 'use-system-theme',
    title: () => $t('color-mode.to-system'),
    handler: () => setMode('system'),
    icon: 'i-mynaui-monitor',
    visible: () => colorMode.preference !== 'system',
  },
)
</script>

<template>
  <div
    v-if="props.variant === 'inline'"
    role="group"
    :aria-label="$t('color-mode.title')"
    flex="~ gap-1"
  >
    <button
      v-for="option of modeOptions"
      :key="option.mode"
      type="button"
      p1.5 rounded
      hover="bg-active"
      :class="colorMode.preference === option.mode ? 'text-primary bg-active/40 dark:text-primary-dark' : ''"
      :aria-label="$t(option.labelKey)"
      :aria-pressed="colorMode.preference === option.mode"
      :title="$t(option.labelKey)"
      @click="setMode(option.mode)"
    >
      <div aria-hidden="true" :class="option.icon" text-lg />
    </button>
  </div>
  <VDropdown v-else theme="layout-dropdown">
    <IconButton
      :tooltip="$t('color-mode.title')"
      tooltip-placement="bottom"
    >
      <div aria-hidden="true" :class="triggerIcon" text-xl />
    </IconButton>
    <template #popper>
      <div class="layout-menu-panel" p2>
        <div flex="~ col gap-1" class="layout-menu-list">
          <button
            v-for="option of modeOptions"
            :key="option.mode"
            type="button"
            class="layout-menu-item"
            px2 py1 rounded
            hover="bg-active"
            flex="~ items-center gap-2 w-full"
            :class="colorMode.preference === option.mode ? 'text-primary dark:text-primary-dark' : ''"
            @click="setMode(option.mode)"
          >
            <div aria-hidden="true" :class="option.icon" />
            <span class="text-left flex-1">{{ $t(option.labelKey) }}</span>
            <div v-if="colorMode.preference === option.mode" aria-hidden="true" i-ph-check />
          </button>
        </div>
      </div>
    </template>
  </VDropdown>
</template>
