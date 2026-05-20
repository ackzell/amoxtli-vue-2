<script setup lang="ts">
import { useTimeAgoIntl } from '@vueuse/core'

const fm = useFileManagerStore()
</script>

<template>
  <div flex="~ items-center">
    <UiSelect v-model="fm.currentSession">
      <UiSelectTrigger class="w-full">
        <UiSelectValue :placeholder="`Your sessions (${fm.sessionList.length})`" />
      </UiSelectTrigger>
      <UiSelectContent class="SelectContent">
        <UiSelectGroup>
          <UiSelectItem v-for="session in fm.sessionList" :key="session.id" :value="session">
            {{ session.name }}
            <span text="xs bgr-300 dark:bgr-500">
              {{ `(${$t('updated')}: ${useTimeAgoIntl(session.updatedAt).value})` }}
            </span>
          </UiSelectItem>
        </UiSelectGroup>
      </UiSelectContent>
    </UiSelect>
    <!-- <div>
      Total sessions:   {{ fm.sessionList.length }}
    </div> -->
  </div>
</template>

<style>
.SelectContent {
  /* max-height: var(--reka-select-content-available-height); */
  max-height: 400px;
}
</style>
