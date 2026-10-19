import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

const KEY_PREFIX = 'invite_'
const CODE_PREFIX = 'AMV-'
const LOCAL_DIR = join(import.meta.dirname, '..', 'data', 'invites')

/**
 * Personal codes are `AMV-<alias><4 random chars>`, so the alias is everything
 * between the prefix and the last four characters.
 *
 * Safe for the legacy records specifically because group invites (whose codes
 * are opaque) did not exist when they were written — every one of them is a
 * personal code. Records that already carry an alias/label are left alone, so
 * re-running is a no-op.
 */
const SUFFIX_LENGTH = 4

interface InviteRecord {
  file: string
  code: string
  data: Record<string, unknown> & { alias?: string, label?: string }
}

function recoverAlias(code: string): string | null {
  if (!code.startsWith(CODE_PREFIX))
    return null

  const body = code.slice(CODE_PREFIX.length)
  if (body.length <= SUFFIX_LENGTH)
    return null

  return body.slice(0, -SUFFIX_LENGTH)
}

function load(): InviteRecord[] {
  if (!existsSync(LOCAL_DIR))
    return []

  return readdirSync(LOCAL_DIR)
    .filter(file => file.startsWith(KEY_PREFIX))
    .sort()
    .map(file => ({
      file,
      code: file.slice(KEY_PREFIX.length),
      data: JSON.parse(readFileSync(join(LOCAL_DIR, file), 'utf-8')),
    }))
}

function main() {
  const write = process.argv.includes('--write')
  const records = load()

  if (!records.length) {
    console.log(`\n  No records in ${LOCAL_DIR}.\n`)
    return
  }

  const recovered: { record: InviteRecord, alias: string }[] = []
  const skipped: InviteRecord[] = []
  let alreadyLabelled = 0

  for (const record of records) {
    if (record.data.label || record.data.alias) {
      alreadyLabelled++
      continue
    }

    const alias = recoverAlias(record.code)
    if (alias)
      recovered.push({ record, alias })
    else
      skipped.push(record)
  }

  if (recovered.length) {
    console.log('')
    console.log(`  ${'code'.padEnd(26)} recovered alias`)
    console.log(`  ${'─'.repeat(60)}`)
    for (const { record, alias } of recovered)
      console.log(`  ${record.code.padEnd(26)} ${alias}`)
  }

  if (skipped.length) {
    console.log('')
    console.log(`  Could not recover an alias for ${skipped.length} code(s):`)
    for (const record of skipped)
      console.log(`    ${record.code}`)
  }

  console.log('')
  console.log(`  ${records.length} record(s) · ${recovered.length} recoverable · ${alreadyLabelled} already named · ${skipped.length} skipped`)

  if (!write) {
    console.log('')
    console.log('  Dry run. Pass --write to apply.')
    console.log('')
    return
  }

  for (const { record, alias } of recovered) {
    writeFileSync(
      join(LOCAL_DIR, record.file),
      JSON.stringify({ ...record.data, alias }, null, 2),
    )
  }

  console.log('')
  console.log(`  Wrote alias into ${recovered.length} record(s) in ${LOCAL_DIR}/`)
  console.log('  Remote KV is untouched; this only makes local append-mode dedupe work.')
  console.log('')
}

main()
