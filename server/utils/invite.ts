import { Buffer } from 'node:buffer'

export interface Redemption {
  name: string
  at: number
  via: 'form'
}

export interface InviteData {
  alias: string
  used: boolean
  usedAt: number | null
  usedByName: string | null
  createdAt: number
  /** Group invites: human label for the cohort/company, e.g. "bitterbrains-oct". */
  label?: string
  /** Group invites: seat cap. Absent means a personal invite (1 seat). */
  maxUses?: number
  /** Group invites: epoch ms after which the link stops working. */
  expiresAt?: number | null
  /** Group invites: set to kill the link for new redemptions. */
  revoked?: boolean
  /** Group invites: one entry per seat taken. */
  redemptions?: Redemption[]
}

export interface SessionData {
  alias: string
  validatedAt: number
  agreed?: boolean
}

export type InviteVerdict = 'ok' | 'invalid' | 'revoked' | 'expired' | 'exhausted'

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000

/** Codes embed the recipient alias verbatim (any case), so allow both. */
export const INVITE_CODE_PATTERN = /^AMV-[A-Za-z0-9-]{1,32}$/

export const MAX_NAME_LENGTH = 64

let hmacKeyCache: CryptoKey | null = null
let hmacKeySecret: string | null = null

async function getHmacKey(secret: string): Promise<CryptoKey> {
  if (hmacKeyCache && hmacKeySecret === secret)
    return hmacKeyCache
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
  hmacKeyCache = key
  hmacKeySecret = secret
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

function fromHex(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex))
    return null
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

export async function signSession(data: SessionData, secret: string): Promise<string> {
  const payload = toBase64url(Buffer.from(JSON.stringify(data)))
  const key = await getHmacKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return `${payload}.${Buffer.from(sig).toString('hex')}`
}

export async function verifySession(
  cookie: string,
  secret: string,
  now: number = Date.now(),
): Promise<SessionData | null> {
  const dot = cookie.indexOf('.')
  if (dot === -1)
    return null

  const payload = cookie.slice(0, dot)
  const sigHex = cookie.slice(dot + 1)

  if (!payload || !sigHex)
    return null

  const sig = fromHex(sigHex)
  if (!sig)
    return null

  const key = await getHmacKey(secret)

  // `crypto.subtle.verify` does the signature comparison in constant time.
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    sig,
    new TextEncoder().encode(payload),
  )
  if (!valid)
    return null

  let session: SessionData
  try {
    session = JSON.parse(fromBase64url(payload).toString())
  }
  catch {
    return null
  }

  if (!session || typeof session.validatedAt !== 'number')
    return null

  // The cookie's `maxAge` is only enforced by the client; a captured cookie
  // would otherwise be replayable forever. Enforce the window server-side too.
  if (now - session.validatedAt > SESSION_MAX_AGE_MS)
    return null

  return session
}

export function getInviteStorage() {
  return useStorage('invites')
}

export function makeInviteKey(code: string) {
  return `invite_${code}`
}

export function getInviteSecret(event?: any): string {
  const secret = (useRuntimeConfig(event).inviteSecret as string) || ''

  // Fail closed: signing with an empty key would make every session forgeable.
  if (!secret.trim()) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Invite secret is not configured (NUXT_INVITE_SECRET)',
    })
  }

  if (secret.trim().length < 32) {
    console.warn('[invites] NUXT_INVITE_SECRET is shorter than 32 characters')
  }

  return secret
}

/** Seats taken. Falls back to the legacy single-use flag for old records. */
export function seatCount(invite: InviteData): number {
  if (invite.redemptions)
    return invite.redemptions.length
  return invite.used ? 1 : 0
}

/** Seat cap. Absent/invalid means a personal (single-seat) invite. */
export function maxSeats(invite: InviteData): number {
  return invite.maxUses && invite.maxUses > 0 ? invite.maxUses : 1
}

/** Whether a group invite has more than one seat. */
export function isGroupInvite(invite: InviteData): boolean {
  return maxSeats(invite) > 1
}

/**
 * Pure decision function for an invite record. Kept free of Nitro globals so
 * it is directly unit-testable.
 */
export function evaluateInvite(
  invite: InviteData | null | undefined,
  now: number,
): InviteVerdict {
  if (!invite)
    return 'invalid'
  if (invite.revoked)
    return 'revoked'
  if (invite.expiresAt && now > invite.expiresAt)
    return 'expired'
  if (seatCount(invite) >= maxSeats(invite))
    return 'exhausted'
  return 'ok'
}

/**
 * Records one seat taken. Materialises a legacy single-use record into the
 * `redemptions` list first, so the two shapes never double-count.
 */
export function applyRedemption(invite: InviteData, name: string, at: number): InviteData {
  const redemptions = invite.redemptions ? [...invite.redemptions] : []

  if (redemptions.length === 0 && invite.used) {
    redemptions.push({
      name: invite.usedByName ?? 'unknown',
      at: invite.usedAt ?? invite.createdAt,
      via: 'form',
    })
  }

  redemptions.push({ name, at, via: 'form' })

  const updated: InviteData = { ...invite, redemptions }

  // Keep the legacy fields accurate for the first seat, so older tooling and
  // the docs' description of the record stay true.
  if (!invite.used) {
    updated.used = true
    updated.usedAt = at
    updated.usedByName = name
  }

  return updated
}
