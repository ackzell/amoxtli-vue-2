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
        <UiButton
          type="button"
          variant="ghost"
          @click="unsaved.choose('cancel')"
        >
          {{ $t('unsaved-changes.cancel') }}
        </UiButton>

        <UiButton
          type="button"
          variant="destructive-outline"
          @click="unsaved.choose('leave')"
        >
          {{ $t('unsaved-changes.leave') }}
        </UiButton>

        <UiButton
          type="button"
          variant="challenge"
          @click="unsaved.choose('save')"
        >
          {{ $t('unsaved-changes.save-and-leave') }}
        </UiButton>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>
