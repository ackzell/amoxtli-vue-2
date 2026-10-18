import { execFileSync } from 'node:child_process'
import process from 'node:process'

const BINDING = 'AMVI_KV'
const KEY_PREFIX = 'invite_'

function wrangler(args: string[]): string {
  return execFileSync('npx', ['wrangler', ...args], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'inherit'],
  })
}

function getKey(key: string): string | null {
  try {
    return wrangler(['kv', 'key', 'get', key, `--binding=${BINDING}`, '--remote']).trim()
  }
  catch {
    return null
  }
}

function putKey(key: string, value: string) {
  wrangler(['kv', 'key', 'put', key, value, `--binding=${BINDING}`, '--remote'])
}

function usage() {
  console.error('Usage: npx tsx scripts/revoke-invite.ts <code> [--undo]')
  console.error('')
  console.error('  Revokes a link so no further seats can be redeemed. It does NOT log')
  console.error('  out people who already redeemed it; their session cookie stays valid')
  console.error('  for its full lifetime.')
  console.error('')
  console.error('  --undo  Clear the revoked flag and make the link usable again.')
  console.error('')
  console.error('Example:')
  console.error('  pnpm invites:revoke AMV-4F2A7C')
  console.error('  pnpm invites:revoke https://preview.amoxtli-vue.ackzell.dev/join/AMV-4F2A7C --undo')
}

/** Accepts a bare code, an `invite_`-prefixed key, or a full /join URL. */
function normalizeCode(input: string): string {
  const trimmed = input.trim()
  const fromUrl = trimmed.match(/\/join\/([^/?#]+)/)
  const raw = fromUrl ? decodeURIComponent(fromUrl[1]!) : trimmed
  return raw.startsWith(KEY_PREFIX) ? raw.slice(KEY_PREFIX.length) : raw
}

function main() {
  const args = process.argv.slice(2)
  const undo = args.includes('--undo')
  const input = args.find(a => !a.startsWith('--'))

  if (!input) {
    usage()
    process.exit(1)
  }

  const code = normalizeCode(input)
  const key = `${KEY_PREFIX}${code}`

  const raw = getKey(key)
  if (!raw) {
    console.error(`\n  No invite found for "${key}".\n`)
    process.exit(1)
  }

  const data = JSON.parse(raw)

  if (undo) {
    if (!data.revoked) {
      console.log(`\n  ${code} is not revoked. Nothing to do.\n`)
      return
    }
    delete data.revoked
    putKey(key, JSON.stringify(data))
    console.log(`\n  ${code} is usable again.\n`)
    return
  }

  if (data.revoked) {
    console.log(`\n  ${code} is already revoked. Nothing to do.\n`)
    return
  }

  data.revoked = true
  putKey(key, JSON.stringify(data))

  const label = data.label || data.alias || '(unlabelled)'
  console.log(`\n  Revoked ${code} (${label}).`)
  console.log('  New redemptions will be refused.')
  console.log('  Anyone who already redeemed keeps their session.\n')
}

main()
