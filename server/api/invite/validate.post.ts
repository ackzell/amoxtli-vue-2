import type { InviteData, InviteVerdict } from '../../utils/invite'
import { env } from 'node:process'
import {
  applyRedemption,
  evaluateInvite,
  getInviteSecret,
  getInviteStorage,
  INVITE_CODE_PATTERN,
  isGroupInvite,
  makeInviteKey,
  MAX_NAME_LENGTH,
  SESSION_MAX_AGE_SECONDS,
  signSession,
} from '../../utils/invite'

export default defineEventHandler(async (event) => {
  const { name, code } = await readBody<{ name?: string, code?: string }>(event)

  const trimmedName = name?.trim() ?? ''
  const trimmedCode = code?.trim() ?? ''

  if (!trimmedName || !trimmedCode) {
    throw createError({ statusCode: 400, statusMessage: 'Name and invite code are required' })
  }

  if (trimmedName.length > MAX_NAME_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: `Name is too long (max ${MAX_NAME_LENGTH} characters)`,
    })
  }

  // Reject anything that can't be a code before it reaches KV.
  if (!INVITE_CODE_PATTERN.test(trimmedCode)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid invite code' })
  }

  const storage = getInviteStorage()
  const key = makeInviteKey(trimmedCode)
  const invite = await storage.getItem<InviteData>(key)

  const verdict = evaluateInvite(invite, Date.now())

  if (verdict !== 'ok') {
    throw createError({ statusCode: 400, statusMessage: describeVerdict(verdict, invite) })
  }

  // `invite` is non-null here: evaluateInvite returns 'invalid' for a miss.
  await storage.setItem(key, applyRedemption(invite!, trimmedName, Date.now()))

  const secret = getInviteSecret(event)
  const session = await signSession(
    { alias: trimmedName, validatedAt: Date.now() },
    secret,
  )

  setCookie(event, 'amv_session', session, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: env.NODE_ENV === 'production',
  })

  return { valid: true, alias: trimmedName }
})

function describeVerdict(verdict: InviteVerdict, invite: InviteData | null): string {
  switch (verdict) {
    case 'revoked':
      return 'This invite link has been revoked'
    case 'expired':
      return 'This invite link has expired'
    case 'exhausted':
      // Keep the familiar wording for a plain single-use code.
      return invite && isGroupInvite(invite)
        ? 'This invite link has no seats left'
        : 'This code has already been used'
    default:
      return 'Invalid invite code'
  }
}
