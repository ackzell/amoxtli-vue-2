let cachedValid = false

const INVITE_PATHS = ['/en/invite', '/es_mx/invite']
const DEFAULT_LOCALE = '/en'

export default defineNuxtRouteMiddleware(async (to) => {
  const config = useRuntimeConfig()

  if (!config.public.inviteOnly) {
    return
  }

  const pagesBranch = config.public.pagesBranch as string
  if (pagesBranch && pagesBranch !== 'main') {
    return
  }

  if (to.path.startsWith('/api') || INVITE_PATHS.some(p => to.path === p || to.path.startsWith(`${p}/`))) {
    return
  }

  if (import.meta.client && cachedValid) {
    return
  }

  const headers: Record<string, string> = {}
  if (import.meta.server) {
    const cookie = useRequestHeaders(['cookie'])
    if (cookie.cookie) {
      headers.cookie = cookie.cookie
    }
  }

  try {
    const { valid } = await $fetch<{ valid: boolean }>('/api/invite/status', { headers })
    if (valid) {
      if (import.meta.client) {
        cachedValid = true
      }
      return
    }
  }
  catch {
    // API unavailable — redirect to be safe
  }

  return navigateTo(`${DEFAULT_LOCALE}/invite`)
})
