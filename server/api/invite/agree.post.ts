import { env } from 'node:process'
import { getInviteSecret, SESSION_MAX_AGE_SECONDS, signSession, verifySession } from '../../utils/invite'

export default defineEventHandler(async (event) => {
  const cookie = getCookie(event, 'amv_session')

  if (!cookie) {
    throw createError({ statusCode: 401, statusMessage: 'No session' })
  }

  const secret = getInviteSecret(event)
  const session = await verifySession(cookie, secret)

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid session' })
  }

  session.agreed = true

  const updated = await signSession(session, secret)

  setCookie(event, 'amv_session', updated, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: env.NODE_ENV === 'production',
  })

  return { agreed: true }
})
