import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import yaml from 'js-yaml'

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const PREFIX = 'AMV'
const LOCAL_DIR = join(import.meta.dirname, '..', 'data', 'invites')
const OUTPUT_FILE = join(import.meta.dirname, '..', 'invites-batch.json')

interface InviteData {
  used: boolean
  usedAt: null
  usedByName: null
  createdAt: number
}

interface InviteEntry {
  code: string
  alias: string
  data: InviteData
}

function generateCode(name: string, seen: Set<string>): string {
  let code: string
  do {
    const bytes = randomBytes(4)
    code = `${PREFIX}-${name}`
    for (let i = 0; i < 4; i++) {
      code += CHARS.charAt(bytes.at(i)! % CHARS.length)
    }
  } while (seen.has(code))
  seen.add(code)
  return code
}

function parseNames(filePath: string): string[] {
  const content = readFileSync(filePath, 'utf-8').trim()
  if (!content)
    return []

  if (content.startsWith('[')) {
    const parsed = JSON.parse(content)
    return Array.isArray(parsed) ? parsed.map(String) : []
  }

  if (content.startsWith('-')) {
    const parsed = yaml.load(content)
    if (Array.isArray(parsed)) {
      return parsed.map((item: unknown): string => {
        if (typeof item === 'string')
          return item
        if (item && typeof item === 'object' && 'alias' in (item as Record<string, unknown>)) {
          return String((item as any).alias ?? '')
        }
        return String(item)
      })
    }
  }

  return content.split('\n')
    .map(l => l.trim())
    .filter((l): l is string => !!l && !l.startsWith('#'))
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
    const alias = (data as any).alias ?? ''
    entries.push({ code, alias, data })
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
  console.log(`\n  ${'─'.repeat(38)}`)
  console.log(`  ${label}`)
  console.log(`  ${'─'.repeat(38)}`)
  console.log(`  ${'Alias'.padEnd(20)} Code`)
  console.log(`  ${'─'.repeat(38)}`)
  for (const { code, alias } of entries) {
    console.log(`  ${(alias || '').padEnd(20)} ${code}`)
  }
  console.log(`  ${'─'.repeat(38)}`)
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
    console.error('  - Alice')
    console.error('  - Bob')
    console.error('  - Charlie')
    process.exit(1)
  }

  const names = parseNames(filePath)
  if (!names.length) {
    console.error('No names found in', filePath)
    process.exit(1)
  }

  const existing = readExistingInvites()
  const existingMap = new Map<string, InviteEntry>()
  const seen = new Set<string>()
  for (const entry of existing) {
    existingMap.set(entry.alias, entry)
    seen.add(entry.code)
  }

  if (overrideFlag) {
    if (existing.length && !forceFlag) {
      console.log(`\n  ${'─'.repeat(38)}`)
      console.log(`  ${'Existing invites'.padEnd(38)}`)
      console.log(`  ${'─'.repeat(38)}`)
      for (const { code, alias } of existing) {
        const used = (existingMap.get(alias)?.data as any)?.used ? ' (used)' : ''
        console.log(`  ${(alias || '').padEnd(20)} ${code}${used}`)
      }
      console.log(`  ${'─'.repeat(38)}`)
      console.log(`  Running --override will OVERWRITE all above.\n`)

      if (!process.stdin.isTTY) {
        console.error('  Non-interactive shell: pass --force to overwrite without prompting.\n')
        process.exit(0)
      }

      if (!(await promptYesNo('  Continue? (y/N) '))) {
        console.log('  Cancelled.\n')
        process.exit(0)
      }
    }

    const entries: InviteEntry[] = []
    for (const alias of names) {
      entries.push({
        code: generateCode(alias, seen),
        alias,
        data: {
          used: false,
          usedAt: null,
          usedByName: null,
          createdAt: Date.now(),
        },
      })
    }

    writeBatch(entries)
    writeLocal(entries)
    printTable(entries, `Codes generated (${entries.length})`)
    console.log(`\n  ${entries.length} code(s) generated.`)
    console.log(`  Local storage: ${LOCAL_DIR}/`)
    console.log(`  Wrangler batch: ${OUTPUT_FILE}\n`)
    return
  }

  // Append mode (default)
  const newEntries: InviteEntry[] = []
  let skippedCount = 0

  for (const alias of names) {
    if (existingMap.has(alias)) {
      skippedCount++
      continue
    }
    newEntries.push({
      code: generateCode(alias, seen),
      alias,
      data: {
        used: false,
        usedAt: null,
        usedByName: null,
        createdAt: Date.now(),
      },
    })
  }

  if (!newEntries.length) {
    console.log('\n  All aliases already have codes. Nothing to generate.\n')
    return
  }

  writeLocal(newEntries)
  writeBatch(newEntries)

  printTable(newEntries, `New codes (${newEntries.length})`)
  if (skippedCount > 0) {
    console.log(`  (skipped ${skippedCount} existing aliases)`)
  }
  console.log(`\n  ${newEntries.length} code(s) generated.`)
  console.log(`  Local storage: ${LOCAL_DIR}/`)
  console.log(`  Wrangler batch: ${OUTPUT_FILE}\n`)
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
