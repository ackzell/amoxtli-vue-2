export default defineEventHandler(async (event) => {
  const cookie = getCookie(event, 'amv_session')

  if (!cookie) {
    return { valid: false, alias: null }
  }

  const session = await verifySession(cookie, getInviteSecret(event))

  if (!session) {
    return { valid: false, alias: null }
  }

  return { valid: true, alias: session.alias, agreed: session.agreed ?? false }
})
