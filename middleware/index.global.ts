const DEFAULT_LOCALE = 'en'

export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/') {
    return navigateTo(`/${DEFAULT_LOCALE}`)
  }

  // Stale WebContainer service worker may redirect to /webcontainer/connect/<hash>
  // without a locale prefix. Route to the session-expired page for the default locale.
  if (to.path.startsWith('/webcontainer/connect/')) {
    return navigateTo(`/${DEFAULT_LOCALE}${to.path}`, { redirectCode: 302 })
  }
})
