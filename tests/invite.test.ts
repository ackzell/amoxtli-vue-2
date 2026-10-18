import type { InviteData } from '~/server/utils/invite'
import { Buffer } from 'node:buffer'
import { describe, expect, it } from 'vitest'
import {
  applyRedemption,
  evaluateInvite,
  INVITE_CODE_PATTERN,
  maxSeats,
  seatCount,
  signSession,
  verifySession,
} from '~/server/utils/invite'

const NOW = 1_800_000_000_000
const SECRET = 'a'.repeat(64)

function makeInvite(overrides: Partial<InviteData> = {}): InviteData {
  return {
    alias: 'Alice',
    used: false,
    usedAt: null,
    usedByName: null,
    createdAt: NOW - 1_000,
    ...overrides,
  }
}

describe('seat accounting', () => {
  it('treats a personal invite as a single seat', () => {
    expect(maxSeats(makeInvite())).toBe(1)
    expect(seatCount(makeInvite())).toBe(0)
  })

  it('ignores a nonsensical seat cap rather than opening the gate', () => {
    expect(maxSeats(makeInvite({ maxUses: 0 }))).toBe(1)
  })

  it('falls back to the legacy flag for records written before redemptions', () => {
    const legacy = makeInvite({ used: true, usedAt: NOW, usedByName: 'Alice' })
    expect(seatCount(legacy)).toBe(1)
  })

  it('counts redemptions when the list is present', () => {
    const group = makeInvite({
      maxUses: 3,
      redemptions: [
        { name: 'Ana', at: NOW, via: 'form' },
        { name: 'Luis', at: NOW, via: 'form' },
      ],
    })
    expect(seatCount(group)).toBe(2)
    expect(maxSeats(group)).toBe(3)
  })
})

describe('evaluateInvite', () => {
  it('rejects an unknown code', () => {
    expect(evaluateInvite(null, NOW)).toBe('invalid')
    expect(evaluateInvite(undefined, NOW)).toBe('invalid')
  })

  it('accepts an unused personal invite', () => {
    expect(evaluateInvite(makeInvite(), NOW)).toBe('ok')
  })

  it('rejects an already-redeemed personal invite', () => {
    expect(evaluateInvite(makeInvite({ used: true, usedAt: NOW }), NOW)).toBe('exhausted')
  })

  it('accepts a group invite while seats remain', () => {
    const group = makeInvite({
      label: 'bitterbrains-oct',
      maxUses: 3,
      redemptions: [{ name: 'Ana', at: NOW, via: 'form' }],
    })
    expect(evaluateInvite(group, NOW)).toBe('ok')
  })

  it('rejects a group invite once every seat is gone', () => {
    const group = makeInvite({
      label: 'bitterbrains-oct',
      maxUses: 3,
      redemptions: [
        { name: 'Ana', at: NOW, via: 'form' },
        { name: 'Luis', at: NOW, via: 'form' },
        { name: 'Eva', at: NOW, via: 'form' },
      ],
    })
    expect(evaluateInvite(group, NOW)).toBe('exhausted')
  })

  it('rejects a revoked link even when seats remain', () => {
    expect(evaluateInvite(makeInvite({ maxUses: 3, revoked: true }), NOW)).toBe('revoked')
  })

  it('rejects an expired link', () => {
    expect(evaluateInvite(makeInvite({ maxUses: 3, expiresAt: NOW - 1 }), NOW)).toBe('expired')
  })

  it('accepts a link whose expiry has not passed', () => {
    expect(evaluateInvite(makeInvite({ maxUses: 3, expiresAt: NOW + 1 }), NOW)).toBe('ok')
  })

  it('treats a missing expiry as never expiring', () => {
    expect(evaluateInvite(makeInvite({ maxUses: 3, expiresAt: null }), NOW)).toBe('ok')
  })

  it('reports revocation ahead of expiry and exhaustion', () => {
    const invite = makeInvite({
      maxUses: 1,
      revoked: true,
      expiresAt: NOW - 1,
      used: true,
      usedAt: NOW,
    })
    expect(evaluateInvite(invite, NOW)).toBe('revoked')
  })
})

describe('applyRedemption', () => {
  it('records the seat and mirrors it into the legacy fields', () => {
    const updated = applyRedemption(makeInvite(), 'Ana', NOW)

    expect(updated.redemptions).toEqual([{ name: 'Ana', at: NOW, via: 'form' }])
    expect(updated.used).toBe(true)
    expect(updated.usedAt).toBe(NOW)
    expect(updated.usedByName).toBe('Ana')
  })

  it('leaves the first redeemer in the legacy fields for later seats', () => {
    const first = applyRedemption(makeInvite({ maxUses: 3 }), 'Ana', NOW)
    const second = applyRedemption(first, 'Luis', NOW + 1)

    expect(second.redemptions).toHaveLength(2)
    expect(second.usedByName).toBe('Ana')
    expect(second.usedAt).toBe(NOW)
  })

  it('materialises a legacy record without double-counting the seat', () => {
    const legacy = makeInvite({ used: true, usedAt: NOW, usedByName: 'Alice' })
    const updated = applyRedemption(legacy, 'Luis', NOW + 1)

    expect(updated.redemptions).toHaveLength(2)
    expect(updated.redemptions?.[0]).toEqual({ name: 'Alice', at: NOW, via: 'form' })
    expect(seatCount(updated)).toBe(2)
  })

  it('does not mutate the original record', () => {
    const original = makeInvite({ maxUses: 3 })
    applyRedemption(original, 'Ana', NOW)

    expect(original.redemptions).toBeUndefined()
    expect(original.used).toBe(false)
  })
})

describe('iNVITE_CODE_PATTERN', () => {
  it('accepts generated codes whatever the alias casing', () => {
    for (const code of ['AMV-TY2A', 'AMV-CarmenHW9M', 'AMV-LOCALCHROME77TS', 'AMV-4F2A7C']) {
      expect(INVITE_CODE_PATTERN.test(code), code).toBe(true)
    }
  })

  it('rejects junk, wrong prefixes, and over-long values', () => {
    for (const code of ['', 'nope', 'AMV-', 'AMV-has space', 'XXX-1234', `AMV-${'A'.repeat(33)}`]) {
      expect(INVITE_CODE_PATTERN.test(code), code).toBe(false)
    }
  })
})

describe('session cookies', () => {
  it('round-trips a signed session', async () => {
    const cookie = await signSession({ alias: 'Ana', validatedAt: NOW }, SECRET)
    const session = await verifySession(cookie, SECRET, NOW)

    expect(session?.alias).toBe('Ana')
  })

  it('rejects a session signed with a different secret', async () => {
    const cookie = await signSession({ alias: 'Ana', validatedAt: NOW }, SECRET)
    expect(await verifySession(cookie, 'b'.repeat(64), NOW)).toBeNull()
  })

  it('rejects a tampered payload', async () => {
    const cookie = await signSession({ alias: 'Ana', validatedAt: NOW }, SECRET)
    const [, signature] = cookie.split('.')
    const forged = Buffer.from(
      JSON.stringify({ alias: 'Attacker', validatedAt: NOW }),
    ).toString('base64url')

    expect(await verifySession(`${forged}.${signature}`, SECRET, NOW)).toBeNull()
  })

  it('rejects a tampered signature', async () => {
    const cookie = await signSession({ alias: 'Ana', validatedAt: NOW }, SECRET)
    const [payload] = cookie.split('.')
    expect(await verifySession(`${payload}.${'0'.repeat(64)}`, SECRET, NOW)).toBeNull()
  })

  it('rejects a malformed cookie', async () => {
    for (const cookie of ['', 'no-dot', '.', 'payload.', '.sig', 'payload.not-hex']) {
      expect(await verifySession(cookie, SECRET, NOW), cookie).toBeNull()
    }
  })

  it('enforces the 30-day window server-side', async () => {
    const thirtyOneDays = 31 * 24 * 60 * 60 * 1000
    const cookie = await signSession(
      { alias: 'Ana', validatedAt: NOW - thirtyOneDays },
      SECRET,
    )
    expect(await verifySession(cookie, SECRET, NOW)).toBeNull()
  })

  it('accepts a session inside the window', async () => {
    const twentyNineDays = 29 * 24 * 60 * 60 * 1000
    const cookie = await signSession(
      { alias: 'Ana', validatedAt: NOW - twentyNineDays },
      SECRET,
    )
    expect(await verifySession(cookie, SECRET, NOW)).not.toBeNull()
  })

  it('preserves the agreed flag', async () => {
    const cookie = await signSession({ alias: 'Ana', validatedAt: NOW, agreed: true }, SECRET)
    const session = await verifySession(cookie, SECRET, NOW)

    expect(session?.agreed).toBe(true)
  })
})
