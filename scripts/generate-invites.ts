import { randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { createInterface } from 'node:readline'
import yaml from 'js-yaml'

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const PREFIX = 'AMV'
const LOCAL_DIR = join(import.meta.dirname, '..', 'data', 'invites')
const OUTPUT_FILE = join(import.meta.dirname, '..', 'invites-batch.json')

interface InviteData {
  alias: string
  used: boolean
  usedAt: null
  usedByName: null
  createdAt: number
}

interface InviteEntry {
  code: string
  data: InviteData
}

function generateCode(): string {
  const bytes = randomBytes(4)
  let code = `${PREFIX}-`
  for (let i = 0; i < 4; i++) {
    code += CHARS.charAt(bytes.at(i)! % CHARS.length)
  }
  return code
}

function parseNames(filePath: string): string[] {
  const content = readFileSync(filePath, 'utf-8').trim()
  if (!content) return []

  if (content.startsWith('[')) {
    const parsed = JSON.parse(content)
    return Array.isArray(parsed) ? parsed.map(String) : []
  }

  if (content.startsWith('-')) {
    const parsed = yaml.load(content)
    if (Array.isArray(parsed)) {
      return parsed.map((item: unknown): string => {
        if (typeof item === 'string') return item
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
  if (!existsSync(LOCAL_DIR)) return []
  const entries: InviteEntry[] = []
  for (const file of readdirSync(LOCAL_DIR)) {
    if (!file.startsWith('invite_')) continue
    const code = file.slice('invite_'.length)
    const data: InviteData = JSON.parse(readFileSync(join(LOCAL_DIR, file), 'utf-8'))
    entries.push({ code, data })
  }
  return entries
}

function promptYesNo(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}

async function confirmOverwrite(): Promise<boolean> {
  const existing = readExistingInvites()
  if (!existing.length) return true

  console.log(`\n  ${'─'.repeat(38)}`)
  console.log(`  ${'Existing invites'.padEnd(38)}`)
  console.log(`  ${'─'.repeat(38)}`)
  for (const { code, data } of existing) {
    const status = data.used ? ' (used)' : ''
    console.log(`  ${data.alias.padEnd(20)} ${code}${status}`)
  }
  console.log(`  ${'─'.repeat(38)}`)
  console.log(`  Running without --append will OVERWRITE all above.\n`)

  if (!process.stdin.isTTY) {
    console.error('  Non-interactive shell: pass --force to overwrite without prompting.\n')
    return false
  }

  return promptYesNo('  Continue? (y/N) ')
}

function printTable(entries: InviteEntry[], label: string) {
  if (!entries.length) return
  console.log(`\n  ${'─'.repeat(38)}`)
  console.log(`  ${label}`)
  console.log(`  ${'─'.repeat(38)}`)
  console.log(`  ${'Alias'.padEnd(20)} Code`)
  console.log(`  ${'─'.repeat(38)}`)
  for (const { code, data } of entries) {
    console.log(`  ${data.alias.padEnd(20)} ${code}`)
  }
  console.log(`  ${'─'.repeat(38)}`)
}

async function main() {
  const args = process.argv.slice(2)
  const appendFlag = args.includes('--append')
  const forceFlag = args.includes('--force')
  const filePath = args.find(a => !a.startsWith('--'))

  if (!filePath) {
    console.error('Usage: npx tsx scripts/generate-invites.ts <invites.yaml> [--append] [--force]')
    console.error('')
    console.error('  --append  Add codes only for new aliases not yet in data/invites/')
    console.error('  --force   Skip overwrite confirmation (non-interactive use)')
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
    existingMap.set(entry.data.alias, entry)
    seen.add(entry.code)
  }

  let entries: InviteEntry[]
  let skippedCount = 0

  if (appendFlag) {
    entries = []
    for (const alias of names) {
      if (existingMap.has(alias)) {
        entries.push(existingMap.get(alias)!)
        skippedCount++
        continue
      }
      const code = generateCode()
      seen.add(code)
      entries.push({
        code,
        data: {
          alias,
          used: false,
          usedAt: null,
          usedByName: null,
          createdAt: Date.now(),
        },
      })
    }

    const newEntries = entries.filter(e => !existingMap.has(e.data.alias))
    if (!newEntries.length) {
      console.log('\n  All aliases already have codes. Nothing to generate.\n')
      return
    }

    if (!existsSync(LOCAL_DIR)) {
      mkdirSync(LOCAL_DIR, { recursive: true })
    }
    for (const { code, data } of newEntries) {
      writeFileSync(join(LOCAL_DIR, `invite_${code}`), JSON.stringify(data, null, 2))
    }

    let existingBatch: { key: string; value: string }[] = []
    if (existsSync(OUTPUT_FILE)) {
      existingBatch = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'))
      const existingKeys = new Set(existingBatch.map(e => e.key))
      for (const entry of newEntries) {
        existingBatch.push({
          key: `invite_${entry.code}`,
          value: JSON.stringify(entry.data),
        })
      }
    } else {
      existingBatch = newEntries.map(({ code, data }) => ({
        key: `invite_${code}`,
        value: JSON.stringify(data),
      }))
    }
    writeFileSync(OUTPUT_FILE, JSON.stringify(existingBatch, null, 2))

    printTable(newEntries, `New codes (${newEntries.length})`)
    if (skippedCount > 0) {
      console.log(`  (skipped ${skippedCount} existing aliases)`)
    }
    console.log(`\n  ${newEntries.length} code(s) generated.`)
    console.log(`  Local storage: ${LOCAL_DIR}/`)
    console.log(`  Wrangler batch: ${OUTPUT_FILE}\n`)
  } else {
    if (!forceFlag && !(await confirmOverwrite())) {
      console.log('  Cancelled.\n')
      process.exit(0)
    }

    entries = []
    for (const alias of names) {
      const code = generateCode()
      seen.add(code)
      entries.push({
        code,
        data: {
          alias,
          used: false,
          usedAt: null,
          usedByName: null,
          createdAt: Date.now(),
        },
      })
    }

    const wranglerBatch = entries.map(({ code, data }) => ({
      key: `invite_${code}`,
      value: JSON.stringify(data),
    }))
    writeFileSync(OUTPUT_FILE, JSON.stringify(wranglerBatch, null, 2))
    console.log(`  Wrangler batch: ${OUTPUT_FILE}`)

    if (!existsSync(LOCAL_DIR)) {
      mkdirSync(LOCAL_DIR, { recursive: true })
    }
    for (const { code, data } of entries) {
      const fp = join(LOCAL_DIR, `invite_${code}`)
      writeFileSync(fp, JSON.stringify(data, null, 2))
    }
    console.log(`  Local storage: ${LOCAL_DIR}/`)

    printTable(entries, `Codes generated (${entries.length})`)
    console.log(`\n  ${entries.length} code(s) generated.\n`)
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})