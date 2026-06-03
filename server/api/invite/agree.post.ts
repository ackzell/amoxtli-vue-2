import { env } from 'node:process'

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
    maxAge: 60 * 60 * 24 * 30,
    secure: env.NODE_ENV === 'production',
  })

  return { agreed: true }
})
