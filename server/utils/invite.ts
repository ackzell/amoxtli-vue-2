export interface InviteData {
  alias: string
  used: boolean
  usedAt: number | null
  usedByName: string | null
  createdAt: number
}

export interface SessionData {
  alias: string
  validatedAt: number
  agreed?: boolean
}

let hmacKeyCache: CryptoKey | null = null

async function getHmacKey(secret: string): Promise<CryptoKey> {
  if (hmacKeyCache) return hmacKeyCache
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
  hmacKeyCache = key
  return key
}

function toBase64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64url(str: string): Buffer {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = base64.length % 4
  return Buffer.from(pad ? base64 + '='.repeat(4 - pad) : base64, 'base64')
}

export async function signSession(data: SessionData, secret: string): Promise<string> {
  const payload = toBase64url(Buffer.from(JSON.stringify(data)))
  const key = await getHmacKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return `${payload}.${Buffer.from(sig).toString('hex')}`
}

export async function verifySession(cookie: string, secret: string): Promise<SessionData | null> {
  const dot = cookie.indexOf('.')
  if (dot === -1) return null

  const payload = cookie.slice(0, dot)
  const sig = cookie.slice(dot + 1)

  if (!payload || !sig) return null

  const key = await getHmacKey(secret)
  const expectedSig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  const expected = Buffer.from(expectedSig).toString('hex')

  if (sig.length !== expected.length || sig !== expected) return null

  try {
    return JSON.parse(fromBase64url(payload).toString())
  } catch {
    return null
  }
}

export function getInviteStorage() {
  return useStorage('invites')
}

export function makeInviteKey(code: string) {
  return `invite_${code}`
}

export function getInviteSecret(event?: any): string {
  return (useRuntimeConfig(event).inviteSecret as string) || ''
}
