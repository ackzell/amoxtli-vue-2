import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { exit } from 'node:process'

const BATCH_FILE = join(import.meta.dirname, '..', 'invites-batch.json')
const REMOTE_FILE = join(import.meta.dirname, '..', 'invites-in-remote.json')

function loadBatch(): Map<string, { key: string, value: string }> {
  if (!existsSync(BATCH_FILE)) {
    console.error('  invites-batch.json not found. Run invites:generate first.')
    exit(1)
  }
  const entries: { key: string, value: string }[] = JSON.parse(readFileSync(BATCH_FILE, 'utf-8'))
  return new Map(entries.map(e => [e.key, e]))
}

function loadRemote(): Set<string> {
  if (!existsSync(REMOTE_FILE)) {
    console.warn('  invites-in-remote.json not found. Run invites:list-remote first.')
    return new Set()
  }
  const text = readFileSync(REMOTE_FILE, 'utf-8').trim()
  if (!text || text.startsWith('[')) {
    const entries: { name: string }[] = JSON.parse(text || '[]')
    return new Set(entries.map(e => e.name))
  }
  return new Set(text.split('\n').map(l => l.trim()).filter(Boolean))
}

function main() {
  const batch = loadBatch()
  const remote = loadRemote()

  if (!batch.size) {
    console.log('\n  invites-batch.json is empty.\n')
    return
  }

  let newCount = 0
  let existingCount = 0

  console.log('')
  for (const [key, entry] of batch) {
    const data = JSON.parse(entry.value)
    const alias = data.alias || data.usedByName || ''
    const label = remote.has(key) ? 'existing' : 'new     '
    if (remote.has(key)) {
      existingCount++
    }
    else {
      newCount++
    }
    console.log(`  ${label}  ${key.replace('invite_', '')}  ${alias}`)
  }
  console.log(`  ${'─'.repeat(38)}`)
  console.log(`  ${newCount} new, ${existingCount} existing, ${batch.size} total in batch\n`)

  if (newCount === 0) {
    console.log('  Nothing new to publish.\n')
  }
}

main()
