interface FeedbackSections {
  'platform-ux': string
  'content': string
  'features': string
  'technical': string
  'design': string
  'general': string
}

const VALID_SECTION_KEYS: (keyof FeedbackSections)[] = [
  'platform-ux',
  'content',
  'features',
  'technical',
  'design',
  'general',
]

export default defineEventHandler(async (event) => {
  const cookie = getCookie(event, 'amv_session')

  if (!cookie) {
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
  }

  const session = await verifySession(cookie, getInviteSecret(event))

  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid session' })
  }

  const body = await readBody(event)
  const { name, sections } = body || {}

  if (!sections || typeof sections !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'Sections object is required' })
  }

  const hasContent = VALID_SECTION_KEYS.some(key =>
    typeof sections[key] === 'string' && sections[key].trim().length > 0,
  )

  if (!hasContent) {
    throw createError({ statusCode: 400, statusMessage: 'At least one section must be filled' })
  }

  const trimmedSections: Partial<FeedbackSections> = {}
  for (const key of VALID_SECTION_KEYS) {
    const val = sections[key]
    if (typeof val === 'string' && val.trim().length > 0) {
      trimmedSections[key] = val.trim()
    }
  }

  const totalLength = Object.values(trimmedSections).reduce((sum, v) => sum + v.length, 0)

  if (totalLength > 10000) {
    throw createError({ statusCode: 400, statusMessage: 'Total feedback too long (max 10000 characters)' })
  }

  const feedback = {
    name: name?.trim() || null,
    sections: trimmedSections,
    page_url: body.page_url || null,
    created_at: new Date().toISOString(),
  }

  const id = `feedback:${Date.now()}:${crypto.randomUUID().slice(0, 8)}`
  const storage = useStorage('feedback')
  await storage.setItem(id, JSON.stringify(feedback))

  return { success: true }
})
