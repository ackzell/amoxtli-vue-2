<script setup lang="ts">
const unsaved = useUnsavedChangesStore()

// The dialog is store-driven; dismissing it (Esc, overlay click, the built-in
// close button) must cancel the pending action rather than silently proceed.
const isOpen = computed<boolean>({
  get: () => unsaved.isOpen,
  set: (open) => {
    if (!open)
      unsaved.choose('cancel')
  },
})
</script>

<template>
  <UiDialog v-model:open="isOpen">
    <UiDialogContent class="">
      <UiDialogHeader>
        <UiDialogTitle>{{ $t('unsaved-changes.title') }}</UiDialogTitle>
        <UiDialogDescription>
          {{ $t('unsaved-changes.body') }}
        </UiDialogDescription>
      </UiDialogHeader>

      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          class="text-sm font-medium px3 py1.5 border border-transparent rounded-lg inline-flex transition-colors items-center justify-center focus-visible:outline-none hover:bg-active focus-visible:ring-2 focus-visible:ring-primary/50"
          @click="unsaved.choose('cancel')"
        >
          {{ $t('unsaved-changes.cancel') }}
        </button>

        <button
          type="button"
          class="text-sm text-negative-700 font-medium px3 py1.5 border border-negative/40 rounded-lg inline-flex transition-colors items-center justify-center dark:text-negative-300 focus-visible:outline-none dark:border-negative-400/50 hover:bg-negative/10 focus-visible:ring-2 focus-visible:ring-primary/50 dark:hover:bg-negative-400/10"
          @click="unsaved.choose('leave')"
        >
          {{ $t('unsaved-changes.leave') }}
        </button>

        <button
          type="button"
          class="text-sm text-white font-medium px3 py1.5 border border-transparent rounded-lg bg-challenge inline-flex transition-colors items-center justify-center focus-visible:outline-none dark:bg-primary-dark-500 hover:bg-challenge-600 focus-visible:ring-2 focus-visible:ring-primary/50 dark:hover:bg-primary-dark-400"
          @click="unsaved.choose('save')"
        >
          {{ $t('unsaved-changes.save-and-leave') }}
        </button>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>
