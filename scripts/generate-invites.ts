import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { createInterface } from 'node:readline'
import yaml from 'js-yaml'

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const PREFIX = 'AMV'
const GROUP_CODE_LENGTH = 6
const SITE_URL = 'https://preview.amoxtli-vue.ackzell.dev'
const LOCAL_DIR = join(import.meta.dirname, '..', 'data', 'invites')
const OUTPUT_FILE = join(import.meta.dirname, '..', 'invites-batch.json')

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
  redemptions?: unknown[]
}

type Entry
  = | { kind: 'personal', alias: string }
    | { kind: 'group', label: string, seats: number, expiresAt: number | null }

interface InviteEntry {
  code: string
  /** Dedupe identity: the alias for a personal invite, the label for a group. */
  key: string
  /** Human label shown in the summary table. */
  display: string
  data: InviteData
}

const UNIT_MS = { m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 } as const

function sanitizeName(name: string): string {
  return name.trim().replace(/^[- ]+|[- ]+$/g, '').trim()
}

function joinUrl(code: string): string {
  return `${SITE_URL}/join/${code}`
}

function generateCode(name: string, seen: Set<string>): string {
  const clean = sanitizeName(name)
  if (!clean)
    throw new Error(`Invalid name: "${name}"`)
  let code: string
  do {
    const bytes = randomBytes(4)
    code = `${PREFIX}-${clean}`
    for (let i = 0; i < 4; i++) {
      code += CHARS.charAt(bytes.at(i)! % CHARS.length)
    }
  } while (seen.has(code))
  seen.add(code)
  return code
}

// Group codes are opaque: they end up in a URL that gets pasted around, so they
// must not embed (and thus leak) the label or the recipient.
function generateGroupCode(seen: Set<string>): string {
  let code: string
  do {
    const bytes = randomBytes(GROUP_CODE_LENGTH)
    code = `${PREFIX}-`
    for (let i = 0; i < GROUP_CODE_LENGTH; i++) {
      code += CHARS.charAt(bytes.at(i)! % CHARS.length)
    }
  } while (seen.has(code))
  seen.add(code)
  return code
}

/**
 * Parses `expires` as a relative span (`14d`, `48h`, `30m`, `2w`) or an
 * absolute date (`2026-11-01`). Returns epoch ms, or null for "never".
 */
function parseExpiry(raw: unknown, now: number): number | null {
  if (raw === undefined || raw === null || raw === '')
    return null

  if (typeof raw === 'number')
    return raw

  const value = String(raw).trim()
  if (!value)
    return null

  const relative = value.match(/^(\d+)\s*([mhdw])$/i)
  if (relative) {
    const amount = Number(relative[1])
    const unit = UNIT_MS[relative[2]!.toLowerCase() as keyof typeof UNIT_MS]
    return now + amount * unit
  }

  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) {
    throw new TypeError(
      `Invalid "expires" value: "${value}" (use e.g. 14d, 48h, or 2026-11-01)`,
    )
  }
  return parsed
}

function toEntry(item: unknown, now: number): Entry | null {
  if (typeof item === 'string' || typeof item === 'number') {
    const alias = sanitizeName(String(item))
    return alias ? { kind: 'personal', alias } : null
  }

  if (!item || typeof item !== 'object')
    return null

  const record = item as Record<string, unknown>
  const rawLabel = record.label ?? record.alias
  if (rawLabel === undefined)
    return null

  const label = sanitizeName(String(rawLabel))
  if (!label)
    return null

  // `label` or `seats` marks a group entry; a bare object with `alias` stays
  // a personal invite so existing files keep working.
  const isGroup = record.label !== undefined || record.seats !== undefined
  if (!isGroup)
    return { kind: 'personal', alias: label }

  const seats = record.seats === undefined ? 1 : Math.trunc(Number(record.seats))
  if (!Number.isFinite(seats) || seats < 1) {
    throw new Error(`Invalid "seats" for "${label}": must be a positive integer`)
  }

  return {
    kind: 'group',
    label,
    seats,
    expiresAt: parseExpiry(record.expires, now),
  }
}

function parseEntries(filePath: string): Entry[] {
  const raw = readFileSync(filePath, 'utf-8')
  const trimmed = raw.trim()
  if (!trimmed)
    return []

  let items: unknown[] | null = null

  if (trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed))
      items = parsed
  }
  else if (/^\s*- /m.test(raw)) {
    const parsed = yaml.load(trimmed)
    if (Array.isArray(parsed))
      items = parsed
  }
  else {
    items = trimmed.split('\n')
      .map(l => l.trim())
      .filter(l => !!l && !l.startsWith('#'))
  }

  if (!items)
    return []

  const now = Date.now()
  return items
    .map(item => toEntry(item, now))
    .filter((entry): entry is Entry => entry !== null)
}

function entryKey(entry: Entry): string {
  return entry.kind === 'personal' ? entry.alias : entry.label
}

function toInviteData(entry: Entry, now: number): InviteData {
  const base: InviteData = {
    alias: '',
    used: false,
    usedAt: null,
    usedByName: null,
    createdAt: now,
  }

  // Personal invites keep their original shape exactly.
  if (entry.kind === 'personal')
    return { ...base, alias: entry.alias }

  return {
    ...base,
    label: entry.label,
    maxUses: entry.seats,
    expiresAt: entry.expiresAt,
    revoked: false,
    redemptions: [],
  }
}

function readExistingInvites(): InviteEntry[] {
  if (!existsSync(LOCAL_DIR))
    return []
  const entries: InviteEntry[] = []
  for (const file of readdirSync(LOCAL_DIR)) {
    if (!file.startsWith('invite_'))
      continue
    const code = file.slice('invite_'.length)
    const data: InviteData = JSON.parse(readFileSync(join(LOCAL_DIR, file), 'utf-8'))
    const display = data.label || data.alias || ''
    entries.push({ code, key: display, display, data })
  }
  return entries
}

function promptYesNo(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}

function printTable(entries: InviteEntry[], label: string) {
  if (!entries.length)
    return
  const rule = '─'.repeat(72)
  console.log(`\n  ${rule}`)
  console.log(`  ${label}`)
  console.log(`  ${rule}`)
  for (const entry of entries) {
    const isGroup = (entry.data.maxUses ?? 1) > 1
    console.log(`  ${entry.display.padEnd(24)} ${entry.code}`)

    if (isGroup) {
      const meta: string[] = [`seats: ${entry.data.maxUses}`]
      if (entry.data.expiresAt) {
        meta.push(`expires: ${new Date(entry.data.expiresAt).toISOString().slice(0, 10)}`)
      }
      else {
        meta.push('no expiry')
      }
      console.log(`  ${''.padEnd(24)} ${meta.join('   ')}`)
      console.log(`  ${''.padEnd(24)} ${joinUrl(entry.code)}`)
    }
  }
  console.log(`  ${rule}`)
}

function writeBatch(entries: InviteEntry[]) {
  const batch = entries.map(({ code, data }) => ({
    key: `invite_${code}`,
    value: JSON.stringify(data),
  }))
  writeFileSync(OUTPUT_FILE, JSON.stringify(batch, null, 2))
}

function writeLocal(entries: InviteEntry[]) {
  if (!existsSync(LOCAL_DIR)) {
    mkdirSync(LOCAL_DIR, { recursive: true })
  }
  for (const { code, data } of entries) {
    writeFileSync(join(LOCAL_DIR, `invite_${code}`), JSON.stringify(data, null, 2))
  }
}

function buildEntries(
  source: Entry[],
  seen: Set<string>,
  now: number,
): InviteEntry[] {
  return source.map((entry) => {
    const code = entry.kind === 'personal'
      ? generateCode(entry.alias, seen)
      : generateGroupCode(seen)
    return {
      code,
      key: entryKey(entry),
      display: entryKey(entry),
      data: toInviteData(entry, now),
    }
  })
}

async function main() {
  const args = process.argv.slice(2)
  const overrideFlag = args.includes('--override')
  const forceFlag = args.includes('--force')
  const filePath = args.find(a => !a.startsWith('--'))

  if (!filePath) {
    console.error('Usage: npx tsx scripts/generate-invites.ts <invites.yaml> [--override] [--force]')
    console.error('')
    console.error('  --override  Regenerate all codes (with confirmation if data/invites/ exists)')
    console.error('  --force     Skip confirmation prompt (non-interactive)')
    console.error('')
    console.error('Example invites.yaml:')
    console.error('  - Alice                                  # personal, single use')
    console.error('  - Bob')
    console.error('  - label: bitterbrains-oct                # group, 3 seats')
    console.error('    seats: 3')
    console.error('    expires: 14d                           # 14d | 48h | 2026-11-01 | omit')
    process.exit(1)
  }

  const source = parseEntries(filePath)
  if (!source.length) {
    console.error('No invite entries found in', filePath)
    process.exit(1)
  }

  const duplicates = new Set<string>()
  const seenKeys = new Set<string>()
  for (const entry of source) {
    const key = entryKey(entry)
    if (seenKeys.has(key))
      duplicates.add(key)
    seenKeys.add(key)
  }
  if (duplicates.size) {
    console.error(`Duplicate entries in ${filePath}: ${[...duplicates].join(', ')}`)
    process.exit(1)
  }

  const now = Date.now()
  const existing = readExistingInvites()
  const existingKeys = new Set(existing.map(entry => entry.key))
  const seen = new Set(existing.map(entry => entry.code))

  if (overrideFlag) {
    if (existing.length && !forceFlag) {
      console.log('\n  ────────────────────────────────────────────────────────────────────────')
      console.log('  Existing invites'.padEnd(74))
      console.log('  ────────────────────────────────────────────────────────────────────────')
      for (const { code, display, data } of existing) {
        const state = data.revoked ? ' (revoked)' : data.used ? ' (used)' : ''
        console.log(`  ${display.padEnd(24)} ${code}${state}`)
      }
      console.log('  ────────────────────────────────────────────────────────────────────────')
      console.log('  Running --override will OVERWRITE all above.\n')

      if (!process.stdin.isTTY) {
        console.error('  Non-interactive shell: pass --force to overwrite without prompting.\n')
        process.exit(0)
      }

      if (!(await promptYesNo('  Continue? (y/N) '))) {
        console.log('  Cancelled.\n')
        process.exit(0)
      }
    }

    const entries = buildEntries(source, seen, now)
    writeBatch(entries)
    writeLocal(entries)
    printTable(entries, `Codes generated (${entries.length})`)
    console.log(`\n  ${entries.length} code(s) generated.`)
    console.log(`  Local storage: ${LOCAL_DIR}/`)
    console.log(`  Wrangler batch: ${OUTPUT_FILE}\n`)
    return
  }

  // Append mode (default): only entries whose key isn't already on disk.
  const newSource = source.filter(entry => !existingKeys.has(entryKey(entry)))
  const skippedCount = source.length - newSource.length

  if (!newSource.length) {
    console.log('\n  All entries already have codes. Nothing to generate.\n')
    return
  }

  const newEntries = buildEntries(newSource, seen, now)

  writeLocal(newEntries)
  writeBatch(newEntries)

  printTable(newEntries, `New codes (${newEntries.length})`)
  if (skippedCount > 0) {
    console.log(`  (skipped ${skippedCount} existing entries)`)
  }
  console.log(`\n  ${newEntries.length} code(s) generated.`)
  console.log(`  Local storage: ${LOCAL_DIR}/`)
  console.log(`  Wrangler batch: ${OUTPUT_FILE}\n`)
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
