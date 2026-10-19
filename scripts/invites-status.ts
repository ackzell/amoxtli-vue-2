import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

const BINDING = 'AMVI_KV'
const KEY_PREFIX = 'invite_'
const LOCAL_DIR = join(import.meta.dirname, '..', 'data', 'invites')
const SITE_URL = 'https://preview.amoxtli-vue.ackzell.dev'
const RULE = '─'.repeat(72)

/**
 * `POST /kv/namespaces/:id/bulk/get` accepts at most 100 keys per request, and
 * wrangler does not chunk this call for us (it only chunks bulk put/delete).
 */
const BULK_GET_MAX = 100

interface Redemption {
  name: string
  at: number
  via?: string
}

interface InviteData {
  alias: string
  used: boolean
  usedAt: number | null
  usedByName: string | null
  createdAt: number
  label?: string
  maxUses?: number
  expiresAt?: number | null
  revoked?: boolean
  redemptions?: Redemption[]
}

interface InviteRecord {
  code: string
  data: InviteData
}

const WRANGLER_BIN = join(import.meta.dirname, '..', 'node_modules', '.bin', 'wrangler')

function wrangler(args: string[]): string {
  // Calling the installed binary directly skips an npx `node` boot per call
  // (~0.7s each), which matters when this runs two commands back to back.
  const localBin = existsSync(WRANGLER_BIN)
  return execFileSync(
    localBin ? WRANGLER_BIN : 'npx',
    localBin ? args : ['wrangler', ...args],
    { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'inherit'] },
  )
}

/** Tolerates wrangler decorating the output with extra log lines. */
function parseJsonBlock(raw: string): unknown {
  const trimmed = raw.trim()

  // The common case: stdout is clean JSON (an object or an array).
  try {
    return JSON.parse(trimmed)
  }
  catch {}

  // Otherwise slice out the outermost JSON value.
  const firstBrace = trimmed.indexOf('{')
  const firstBracket = trimmed.indexOf('[')
  const starts = [firstBrace, firstBracket].filter(index => index !== -1)
  if (!starts.length)
    throw new Error(`Unexpected wrangler output: ${raw.slice(0, 120)}`)

  const start = Math.min(...starts)
  const end = Math.max(trimmed.lastIndexOf('}'), trimmed.lastIndexOf(']'))
  if (end <= start)
    throw new Error(`Unexpected wrangler output: ${raw.slice(0, 120)}`)

  return JSON.parse(trimmed.slice(start, end + 1))
}

/** Tolerates wrangler decorating the value with extra log lines. */
function parseValue(raw: string): InviteData {
  return parseJsonBlock(raw) as InviteData
}

function loadLocal(): InviteRecord[] {
  if (!existsSync(LOCAL_DIR))
    return []
  return readdirSync(LOCAL_DIR)
    .filter(file => file.startsWith(KEY_PREFIX))
    .map((file) => {
      const code = file.slice(KEY_PREFIX.length)
      const data = JSON.parse(readFileSync(join(LOCAL_DIR, file), 'utf-8'))
      return { code, data }
    })
}

/** Fetches up to BULK_GET_MAX values in one request. */
function bulkGet(keys: string[]): Record<string, string> {
  const file = join(tmpdir(), `invites-bulk-get-${process.pid}-${Date.now()}.json`)
  writeFileSync(file, JSON.stringify(keys))

  try {
    const parsed = parseJsonBlock(
      wrangler(['kv', 'bulk', 'get', file, `--binding=${BINDING}`, '--remote']),
    ) as Record<string, unknown>

    // Remote returns `{ key: "<value>" }`; `--local` returns
    // `{ key: { value } }`. Normalise to a plain string map.
    const values: Record<string, string> = {}
    for (const [key, value] of Object.entries(parsed)) {
      values[key] = typeof value === 'string'
        ? value
        : String((value as { value?: unknown } | null)?.value ?? '')
    }
    return values
  }
  finally {
    rmSync(file, { force: true })
  }
}

function loadRemote(): InviteRecord[] {
  const listed = parseJsonBlock(
    wrangler(['kv', 'key', 'list', `--binding=${BINDING}`, '--remote']),
  ) as (string | { name: string })[]

  const keys = listed
    .map(entry => (typeof entry === 'string' ? entry : entry.name))
    .filter(name => name.startsWith(KEY_PREFIX))

  const records: InviteRecord[] = []

  for (let index = 0; index < keys.length; index += BULK_GET_MAX) {
    const chunk = keys.slice(index, index + BULK_GET_MAX)
    process.stderr.write(`  fetching ${Math.min(index + chunk.length, keys.length)}/${keys.length}\r`)

    const values = bulkGet(chunk)
    for (const name of chunk) {
      const raw = values[name]
      if (raw === undefined)
        continue
      records.push({ code: name.slice(KEY_PREFIX.length), data: parseValue(raw) })
    }
  }

  if (keys.length)
    process.stderr.write('\n')

  return records
}

function maxSeats(data: InviteData): number {
  return data.maxUses && data.maxUses > 0 ? data.maxUses : 1
}

function redemptions(data: InviteData): Redemption[] {
  if (data.redemptions)
    return data.redemptions
  if (data.used)
    return [{ name: data.usedByName ?? 'unknown', at: data.usedAt ?? data.createdAt, via: 'form' }]
  return []
}

function formatTime(at: number): string {
  return new Date(at).toISOString().replace('T', ' ').slice(0, 16)
}

function formatExpiry(expiresAt: number, now: number): string {
  const date = new Date(expiresAt).toISOString().slice(0, 10)
  const days = Math.ceil((expiresAt - now) / 86_400_000)
  if (days < 0)
    return `${date} (expired)`
  return `${date} (in ${days}d)`
}

function main() {
  const useLocal = process.argv.includes('--local')
  const now = Date.now()

  const records = (useLocal ? loadLocal() : loadRemote())
    .sort((a, b) => (a.data.label ?? a.data.alias ?? '').localeCompare(b.data.label ?? b.data.alias ?? ''))

  if (!records.length) {
    console.log(`\n  No invites found in ${useLocal ? LOCAL_DIR : 'the remote namespace'}.\n`)
    return
  }

  let totalSeats = 0
  let usedSeats = 0
  let liveLinks = 0

  console.log(`\n  ${RULE}`)
  console.log(`  Invites (${useLocal ? 'local' : 'remote'}) — times are UTC`)
  console.log(`  ${RULE}`)

  for (const { code, data } of records) {
    const isGroup = maxSeats(data) > 1
    const taken = redemptions(data)
    const expired = !!data.expiresAt && now > data.expiresAt
    const exhausted = taken.length >= maxSeats(data)

    totalSeats += maxSeats(data)
    usedSeats += Math.min(taken.length, maxSeats(data))
    if (!data.revoked && !expired && !exhausted)
      liveLinks++

    const label = data.label || data.alias || '(unlabelled)'
    // Only flag states that need attention; a plain used/unused personal
    // invite already says so in the seats column.
    const status = data.revoked
      ? 'REVOKED'
      : expired
        ? 'EXPIRED'
        : isGroup && exhausted
          ? 'FULL'
          : null

    const seats = isGroup ? `${taken.length}/${maxSeats(data)} seats` : (taken.length ? 'used' : 'unused')
    console.log('')
    console.log(`  ${label}  —  ${seats}${status ? `  [${status}]` : ''}`)
    console.log(`    code       ${code}`)
    if (data.label)
      console.log(`    link       ${SITE_URL}/join/${code}`)
    if (data.expiresAt)
      console.log(`    expires    ${formatExpiry(data.expiresAt, now)}`)

    if (taken.length) {
      taken.forEach((redemption, index) => {
        const prefix = index === 0 ? 'redeemed  ' : '          '
        console.log(`    ${prefix} ${(redemption.name || 'unknown').padEnd(20)} ${formatTime(redemption.at)}`)
      })
    }
    else {
      console.log('    redeemed   (nobody yet)')
    }
  }

  console.log('')
  console.log(`  ${RULE}`)
  console.log(`  ${records.length} link(s) · ${usedSeats}/${totalSeats} seats taken · ${liveLinks} still open`)
  console.log(`  ${RULE}\n`)
}

main()
