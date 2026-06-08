<script setup lang="ts">
const router = useRouter()
const i18n = useI18n()

function goHome() {
  router.push(`/${i18n.locale.value}`)
}
</script>

<template>
  <div flex="~ col" p-8 gap-4 h-screen items-center justify-center>
    <div i-carbon:warning text-5xl opacity-40 />
    <h1 text-xl font-semibold>
      Session Expired
    </h1>
    <p text-sm text-center opacity-60 max-w-md>
      The WebContainer preview session you are trying to reconnect to has ended.
      Close this tab and return to the lesson page to start a new session.
    </p>
    <button btn @click="goHome">
      Go back home
    </button>
  </div>
</template>
