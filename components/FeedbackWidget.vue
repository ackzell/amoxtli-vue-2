<script setup lang="ts">
export interface FeedbackSections {
  'platform-ux': string
  'content': string
  'features': string
  'technical': string
  'design': string
  'general': string
}

const { t } = useI18n()

const isOpen = defineModel<boolean>('open', { default: false })

const name = ref('')
const sending = ref(false)
const submitted = ref(false)
const error = ref('')

const sections = reactive<FeedbackSections>({
  'platform-ux': '',
  'content': '',
  'features': '',
  'technical': '',
  'design': '',
  'general': '',
})

watch(isOpen, (val) => {
  if (!val) {
    submitted.value = false
    error.value = ''
    sending.value = false
    for (const key of Object.keys(sections)) {
      (sections as Record<string, string>)[key] = ''
    }
  }
})

interface SectionDef {
  key: keyof FeedbackSections
  labelKey: string
  promptKey: string
  rows: number
}

const sectionDefs: SectionDef[] = [
  { key: 'platform-ux', labelKey: 'feedback.category-platform-ux', promptKey: 'feedback.prompt-platform-ux', rows: 2 },
  { key: 'content', labelKey: 'feedback.category-content', promptKey: 'feedback.prompt-content', rows: 2 },
  { key: 'features', labelKey: 'feedback.category-features', promptKey: 'feedback.prompt-features', rows: 2 },
  { key: 'technical', labelKey: 'feedback.category-technical', promptKey: 'feedback.prompt-technical', rows: 2 },
  { key: 'design', labelKey: 'feedback.category-design', promptKey: 'feedback.prompt-design', rows: 2 },
  { key: 'general', labelKey: 'feedback.category-general', promptKey: 'feedback.prompt-general', rows: 3 },
]

const isFormEmpty = computed(() => {
  return Object.values(sections).every(value => value.trim() === '')
})

onMounted(async () => {
  try {
    const { alias } = await $fetch('/api/invite/status')
    if (alias) {
      name.value = alias
    }
  }
  catch {
    // not authenticated
  }
})

async function submit() {
  const nonEmpty = Object.fromEntries(
    Object.entries(sections).filter(([_, v]) => (v as string).trim().length > 0),
  )

  if (Object.keys(nonEmpty).length === 0)
    return

  sending.value = true
  error.value = ''
  try {
    await $fetch('/api/feedback', {
      method: 'POST',
      body: { name: name.value || null, sections: nonEmpty },
    })
    submitted.value = true
  }
  catch {
    error.value = t('feedback.toast-error')
  }
  finally {
    sending.value = false
  }
}
</script>

<template>
  <UiDialog v-model:open="isOpen">
    <UiDialogTrigger as-child>
      <slot />
    </UiDialogTrigger>
    <UiDialogContent class="sm:max-w-xl">
      <UiDialogHeader v-if="!submitted && !sending">
        <div sticky>
          <UiDialogTitle>{{ $t('feedback.heading') }}</UiDialogTitle>
          <UiDialogDescription>
            <p>{{ $t('feedback.prompts') }}</p>
          </UiDialogDescription>
        </div>
      </UiDialogHeader>

      <div v-if="submitted" my-8 text-center>
        <p text-lg text-positive font-medium dark:text-positive-300>
          {{ $t('feedback.toast-success') }}
        </p>
        <p text-sm mt-2 op70>
          {{ $t('feedback.toast-success-desc') }}
        </p>
      </div>

      <div v-else-if="sending">
        <p my-8 text-center flex gap2 items-center justify-center>
          <span i-svg-spinners-pulse-multiple h6 inline-block />{{ $t('feedback.sending') }}
        </p>
      </div>

      <form v-else @submit.prevent="submit">
        <div v-if="error" class="sc-error-message">
          {{ error }}
        </div>
        <UiScrollArea class="max-h-[50vh]" flex="~ col" px4>
          <div flex="~ col gap-4">
            <div>
              <label for="name" class="dark:text-bgr-200-dark/70 text-xs text-bgr-300/70 font-medium block">
                {{ $t('feedback.your-name') }}
              </label>
              <input
                id="name"
                v-model="name"
                autocomplete="name"
                type="text"
                :placeholder="$t('feedback.placeholder-name')"
                class="text-sm px-3 py-2 outline-none border border-bgr-300 rounded-md bg-bgr-100/50 w-full transition-colors dark:border-bgr-600 focus:border-primary dark:bg-bgr-800/50 dark:focus:border-primary-dark"
              >
            </div>

            <div
              v-for="def in sectionDefs"
              :key="def.key"
            >
              <p class="text-xs text-bgr-400 font-medium dark:text-bgr-200/80">
                {{ $t(def.labelKey) }}
              </p>
              <p class="text-[11px] text-bgr-400/90 leading-relaxed dark:text-bgr-200/50">
                {{ $t(def.promptKey) }}
              </p>
              <textarea
                v-model="sections[def.key]"
                :name="def.key"
                :rows="def.rows"
                field-sizing-content
                class="text-sm px-3 py-2 outline-none border border-bgr-300 rounded-md bg-bgr-100/50 w-full resize-y transition-colors dark:border-bgr-600 focus:border-primary dark:bg-bgr-800/50 dark:focus:border-primary-dark"
              />
            </div>
          </div>
        </UiScrollArea>
        <button
          type="submit"
          sticky
          un-disabled="op40  pointer-events-none bg-bgr-200 dark:bg-bgr-700"
          class="text-sm text-white font-medium my-4 py-2 rounded-md w-full transition-opacity bg-primary! hover:opacity-90 dark:bg-primary-dark!"
          :disabled="sending || isFormEmpty"
          @click="submit"
        >
          {{ sending ? $t('feedback.sending') : $t('feedback.send') }}
        </button>
        <p text-xs op50 italic>
          {{ $t('feedback.p-s') }}
        </p>
      </form>
    </UiDialogContent>
  </UiDialog>
</template>
