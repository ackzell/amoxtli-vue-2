import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

const BINDING = 'AMVI_KV'
const KEY_PREFIX = 'invite_'
const LOCAL_DIR = join(import.meta.dirname, '..', 'data', 'invites')
const SITE_URL = 'https://preview.amoxtli-vue.ackzell.dev'
const RULE = '─'.repeat(72)

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

function wrangler(args: string[]): string {
  return execFileSync('npx', ['wrangler', ...args], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'inherit'],
  })
}

/** Tolerates wrangler decorating the value with extra log lines. */
function parseValue(raw: string): InviteData {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1)
    throw new Error(`Unexpected KV value: ${raw.slice(0, 80)}`)
  return JSON.parse(raw.slice(start, end + 1))
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

function loadRemote(): InviteRecord[] {
  const listed: { name: string }[] = JSON.parse(
    wrangler(['kv', 'key', 'list', `--binding=${BINDING}`, '--remote']),
  )
  const keys = listed.map(entry => entry.name).filter(name => name.startsWith(KEY_PREFIX))

  return keys.map((name, index) => {
    process.stderr.write(`  fetching ${index + 1}/${keys.length}\r`)
    const raw = wrangler(['kv', 'key', 'get', name, `--binding=${BINDING}`, '--remote'])
    return { code: name.slice(KEY_PREFIX.length), data: parseValue(raw) }
  })
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
