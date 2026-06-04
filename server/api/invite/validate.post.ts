export default defineEventHandler(async (event) => {
  const { name, code } = await readBody<{ name?: string, code?: string }>(event)

  if (!name?.trim() || !code?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Name and invite code are required' })
  }

  const trimmedCode = code.trim()

  const storage = getInviteStorage()
  const key = makeInviteKey(trimmedCode)
  const invite = await storage.getItem<InviteData>(key)

  if (!invite) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid invite code' })
  }

  if (invite.used) {
    throw createError({ statusCode: 400, statusMessage: 'This code has already been used' })
  }

  invite.used = true
  invite.usedAt = Date.now()
  invite.usedByName = name.trim()
  await storage.setItem(key, invite)

  const secret = getInviteSecret(event)
  const session = await signSession(
    { alias: name.trim(), validatedAt: Date.now() },
    secret,
  )

  setCookie(event, 'amv_session', session, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === 'production',
  })

  return { valid: true, alias: name.trim() }
})
