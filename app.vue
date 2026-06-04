<script setup lang="ts">
import '@unocss/reset/tailwind.css'
import './styles/base.css'
import './styles/prose.css'
import './styles/overrides.css'
import './styles/twoslash.css'

const config = useRuntimeConfig()
const router = useRouter()
const showAgreement = ref(false)
const alias = ref('')
useThemeTransition()

const INVITE_PATHS = ['/en/invite', '/es_mx/invite']

function isInvitePath(path: string) {
  return INVITE_PATHS.some(p => path === p || path.startsWith(`${p}/`))
}

async function checkAgreement(explicitPath?: string) {
  const path = explicitPath ?? useRoute().path
  if (!config.public.inviteOnly || isInvitePath(path))
    return
  try {
    const res = await $fetch<{ valid: boolean, agreed?: boolean, alias?: string }>('/api/invite/status')
    if (res.valid && !res.agreed) {
      showAgreement.value = true
      alias.value = res.alias || ''
    }
  }
  catch {}
}

onMounted(checkAgreement)

router.afterEach((to) => {
  if (showAgreement.value)
    return
  checkAgreement(to.path)
})

function onAgreementClose() {
  showAgreement.value = false
}
</script>

<template>
  <NuxtPage page-key="playground" />

  <AgreementDialog v-if="showAgreement" :name="alias" @close="onAgreementClose" />

  <div data-tooltip-content-target="globals" />
</template>
