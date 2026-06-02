<script setup lang="ts">
import { motion } from 'motion-v'

const route = useRoute()
const locale = route.path.split('/')[1] || 'en'
const checking = ref(true)

const name = ref('')
const code = ref('')
const error = ref('')
const loading = ref(false)

useThemeTransition()

function normalizeCode(e: Event) {
  const input = e.target as HTMLInputElement
  input.value = input.value.toUpperCase()
}

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const res = await $fetch<{ valid: boolean, alias: string }>('/api/invite/validate', {
      method: 'POST',
      body: { name: name.value, code: code.value },
    })
    if (res.valid) {
      const locale = useRoute().path.split('/')[1] || 'en'
      await navigateTo(`/${locale}/invite/welcome`)
    }
  }
  catch (e: any) {
    error.value = e?.data?.statusMessage || 'Something went wrong. Please try again.'
  }
  finally {
    loading.value = false
  }
}

onBeforeMount(async () => {
  const { valid, agreed } = await $fetch('/api/invite/status').catch(() => {})
  if (valid && !agreed)
    await navigateTo(`/${locale}/invite/welcome`)
  if (valid && agreed)
    await navigateTo(`/${locale}`)
  checking.value = false
})
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <div class="p-4 flex justify-end">
      <ColorSchemeToggle />
    </div>

    <div v-if="checking">
      <div class="flex flex-1 items-center justify-center">
        <div i-svg-spinners-pulse-multiple mr3 />
        <pre font-mono>{{ $t('hang-on-a-sec') }}</pre>
      </div>
    </div>

    <div v-else class="px-4 pb-24 flex flex-1 items-center justify-center">
      <div class="flex flex-col gap-6 max-w-md w-full">
        <div class="text-center">
          <h1 class="text-4xl text-primary font-sans dark:text-primary-dark">
            {{ $t('amoxtli-vue') }}
          </h1>
          <p class="text-lg text-faded mt-2">
            {{ $t('interactive-book-about-vue') }}
          </p>
        </div>

        <div min-h-12>
          <motion.div
            v-if="error"
            initial="hidden"
            animate="visible"
            exit="hidden"
            :variants="{
              hidden: { opacity: 0, y: -10, scale: 0.95 },
              visible: { opacity: 1, y: 0, scale: 1 },
            }"
            class="text-sm text-negative-700 p-3 border border-negative/30 rounded-md bg-negative/10 dark:text-negative-300"
          >
            {{ error }}
          </motion.div>
        </div>

        <div class="p-8 border border-base rounded-xl bg-base shadow-lg">
          <form class="space-y-5" @submit.prevent="submit">
            <div>
              <label for="name" class="text-sm text-faded font-medium mb-1.5 block">
                {{ $t('your-name') }}
              </label>
              <input
                id="name"
                v-model="name"
                type="text"
                placeholder="Enter your name"
                class="placeholder:text-faded/50 rounded-lg bg-bgr-100/20 transition focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/90 dark:border-primary-dark! dark:focus:ring-primary-dark/90"
                :disabled="loading"

                border="border-input"

                required text-foreground px-4 py-2.5 w-full dark:text-foreground-dark
              >
            </div>

            <div>
              <label for="code" class="text-sm text-faded font-medium mb-1.5 block">
                {{ $t('invite-code') }}
              </label>
              <input
                id="code"
                v-model="code"
                type="text"
                placeholder="AMV-XXXX"
                class="placeholder:text-faded/50 rounded-lg bg-bgr-100/20 transition focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/90 dark:border-primary-dark! dark:focus:ring-primary-dark/90"
                :disabled="loading"

                border="border-input"

                required text-foreground px-4 py-2.5 w-full dark:text-foreground-dark
                @input="normalizeCode"
              >
            </div>

            <button
              type="submit"
              class="text-white font-medium px-4 py-2.5 rounded-md w-full transition bg-primary! disabled:opacity-50 disabled:cursor-not-allowed active:brightness-90 hover:brightness-110 dark:bg-primary-dark!"
              un-disabled="bg-bgr-200! dark:bg-bgr-700!"

              :disabled="loading || !name.trim() || !code.trim()"
            >
              {{ loading ? `${$t('entering')}\u2026` : $t('enter') }}
            </button>
          </form>
        </div>

        <p class="text-xs text-foreground/60 mt-6 text-center dark:text-bgr-400/80">
          {{ $t('invite-code-required') }}
        </p>
      </div>
    </div>
  </div>
</template>
