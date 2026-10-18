import type { InviteData } from '../../utils/invite'
import {
  evaluateInvite,
  getInviteStorage,
  INVITE_CODE_PATTERN,
  makeInviteKey,
} from '../../utils/invite'

// Must stay in sync with `i18n.locales` in nuxt.config.ts.
const LOCALES = ['en', 'es_mx'] as const
const DEFAULT_LOCALE = 'en'

/**
 * Resolves a target locale from `?l=`, then `Accept-Language`, then the
 * default. Only locales the app actually ships are ever returned.
 */
function pickLocale(explicit: unknown, acceptLanguage: string): string {
  if (typeof explicit === 'string' && (LOCALES as readonly string[]).includes(explicit)) {
    return explicit
  }

  for (const part of acceptLanguage.split(',')) {
    const tag = part.split(';')[0]?.trim().toLowerCase()
    if (!tag)
      continue

    if (tag.startsWith('es'))
      return 'es_mx'

    const base = tag.split('-')[0]
    if (base && (LOCALES as readonly string[]).includes(base))
      return base
  }

  return DEFAULT_LOCALE
}

/**
 * Short shareable link for an invite: `/join/AMV-XXXX`.
 *
 * Strictly read-only — it never redeems a seat and never sets a session. That
 * matters: chat clients and antivirus scanners fetch every URL they see, so a
 * GET that consumed a seat would drain a link before a human ever clicked it.
 * Redemption stays a deliberate form submit on the invite page.
 */
export default defineEventHandler(async (event) => {
  const code = (getRouterParam(event, 'code') ?? '').trim()
  const locale = pickLocale(
    getQuery(event).l,
    getHeader(event, 'accept-language') ?? '',
  )

  // Never let an intermediary cache a URL that carries a code.
  setHeader(event, 'cache-control', 'no-store')
  setHeader(event, 'x-robots-tag', 'noindex, nofollow')

  let error = ''
  if (!INVITE_CODE_PATTERN.test(code)) {
    error = 'invalid'
  }
  else {
    const invite = await getInviteStorage().getItem<InviteData>(makeInviteKey(code))
    const verdict = evaluateInvite(invite, Date.now())
    if (verdict !== 'ok')
      error = verdict
  }

  // Hand the code to the form so it is pre-filled either way, and attach the
  // reason so the page can explain why the link did not work.
  const params = new URLSearchParams()
  if (code)
    params.set('code', code)
  if (error)
    params.set('error', error)

  const query = params.toString()
  return sendRedirect(event, `/${locale}/invite${query ? `?${query}` : ''}`, 302)
})
