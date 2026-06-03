<script setup lang="ts">
const props = defineProps<{
  name: string
}>()
const emit = defineEmits<{ close: [] }>()
const { t, setLocale, locale } = useI18n()
const loading = ref(false)
const error = ref('')

async function agree() {
  loading.value = true
  error.value = ''
  try {
    await $fetch('/api/invite/agree', { method: 'POST' })
    emit('close')
  }
  catch (e: any) {
    error.value = e?.data?.statusMessage || t('invite.agreement.error')
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <UiAlertDialog :open="true">
    <UiAlertDialogContent>
      <UiAlertDialogHeader>
        <UiAlertDialogTitle>
          <div flex items-center justify-between>
            <div text-xs font-normal flex gap-2>
              <button
                :class="{
                  'text-primary dark:text-primary-dark': locale === 'en',
                }" @click="setLocale('en')"
              >
                {{ $t('english') }}
              </button>

              <button
                :class="{
                  'text-primary dark:text-primary-dark': locale === 'es_mx',
                }" @click="setLocale('es_mx')"
              >
                {{ $t('espanol-mexico') }}
              </button>
            </div>
            <ColorSchemeToggle />
          </div>
          {{ t('invite.agreement.title', { name: props.name }) }}
        </UiAlertDialogTitle>
      </UiAlertDialogHeader>
      <UiAlertDialogDescription>
        <p class="text-sm">
          {{ t('invite.agreement.body') }}
        </p>
        <p class="text-sm mt-2">
          {{ t('invite.agreement.note') }}
        </p>
        <p class="text-sm mt-2">
          {{ t('invite.agreement.note2') }}
        </p>
      </UiAlertDialogDescription>

      <p v-if="error" class="text-sm text-negative-700 dark:text-negative-300">
        {{ error }}
      </p>

      <UiAlertDialogFooter>
        <UiAlertDialogAction>
          <YvButton
            :disabled="loading"
            @click.prevent="agree"
          >
            {{ loading ? `${t('invite.agreement.entering')}\u2026` : t('invite.agreement.continue') }}
          </YvButton>
        </UiAlertDialogAction>
      </UiAlertDialogFooter>
    </UiAlertDialogContent>
  </UiAlertDialog>
</template>
