#!/usr/bin/env node
/**
 * Vendor `almostnode` into `vendor/` and point this project's dependency at
 * the packed tarball.
 *
 * The tarball name embeds the package version, so this script — not a human —
 * keeps `package.json` in sync. Run it after bumping almostnode:
 *
 *   pnpm sync:almostnode
 *
 * The work is skipped when the source tree, the version, the vendored tarball
 * and the installed copy already agree (see vendor/almostnode-sync.json).
 *
 * Pass `--force` to rebuild anyway, or `--skip-install` to build/pack/rewrite
 * without running `pnpm install`.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const vendorDir = join(root, 'vendor')
const amoxtliPkgPath = join(root, 'package.json')
const depName = 'almostnode'
const packageDir = process.env.ALMOSTNODE_DIR
  ?? resolve(root, '../oss/almostnode')
const shouldInstall = !process.argv.includes('--skip-install')
const shouldForce = process.argv.includes('--force')
const statePath = join(vendorDir, `${depName}-sync.json`)

function run(command, args, cwd) {
  execFileSync(command, args, { cwd, stdio: 'inherit' })
}

/**
 * Hash the source that goes into the tarball: the version plus every tracked
 * and untracked-but-not-ignored file. Ignores build output (dist/ etc.), so a
 * stale dist alone does not keep the sync from rebuilding.
 */
function sourceTreeHash(dir, version) {
  const listed = execFileSync('git', ['-C', dir, 'ls-files', '-z', '-c', '-o', '--exclude-standard'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean)
  const hash = createHash('sha256')
  hash.update(`version:${version}\n`)
  for (const rel of [...listed].sort()) {
    hash.update(`${rel}\0`)
    const abs = join(dir, rel)
    if (existsSync(abs))
      hash.update(readFileSync(abs))
    hash.update('\0')
  }
  return hash.digest('hex')
}

const sourcePkgPath = join(packageDir, 'package.json')
if (!existsSync(sourcePkgPath)) {
  console.error(`[sync:almostnode] package not found at ${packageDir}`)
  console.error('Set ALMOSTNODE_DIR to the package directory.')
  process.exit(1)
}

const sourcePkg = JSON.parse(readFileSync(sourcePkgPath, 'utf8'))
const tarballBase = sourcePkg.name.replace(/^@/, '').replace('/', '-')
const tarball = `${tarballBase}-${sourcePkg.version}.tgz`
const dependency = `file:vendor/${tarball}`
const currentPkg = readFileSync(amoxtliPkgPath, 'utf8')
const escapedName = depName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const dependencyPattern = new RegExp(`("${escapedName}"\\s*:\\s*")[^"]*(")`)

if (!dependencyPattern.test(currentPkg)) {
  console.error(`[sync:almostnode] ${depName} not found in package.json`)
  process.exit(1)
}

const installedPkgPath = join(root, 'node_modules', depName, 'package.json')
const installedVersion = existsSync(installedPkgPath)
  ? JSON.parse(readFileSync(installedPkgPath, 'utf8')).version
  : undefined
const previous = existsSync(statePath)
  ? JSON.parse(readFileSync(statePath, 'utf8'))
  : undefined
const hash = sourceTreeHash(packageDir, sourcePkg.version)

const upToDate = !shouldForce
  && previous?.hash === hash
  && previous?.tarball === tarball
  && existsSync(join(vendorDir, tarball))
  && currentPkg.includes(`"${depName}": "${dependency}"`)
  && installedVersion === sourcePkg.version

if (upToDate) {
  console.log(`[sync:almostnode] ${sourcePkg.name}@${sourcePkg.version} already vendored — nothing to do`)
  process.exit(0)
}

console.log(`[sync:almostnode] packing ${sourcePkg.name}@${sourcePkg.version}`)
run('pnpm', ['build:lib'], packageDir)
try {
  run('pnpm', ['build:types'], packageDir)
}
catch {
  console.warn('[sync:almostnode] WARN build:types failed — see its tsc errors; dist/*.d.ts were still emitted')
}
run('pnpm', ['pack', '--pack-destination', vendorDir], packageDir)

if (!existsSync(join(vendorDir, tarball))) {
  console.error(`[sync:almostnode] ${tarball} is missing from vendor/ — did pnpm pack change its naming?`)
  process.exit(1)
}

for (const file of readdirSync(vendorDir)) {
  if (file !== tarball && file.startsWith(`${tarballBase}-`) && file.endsWith('.tgz')) {
    unlinkSync(join(vendorDir, file))
    console.log(`[sync:almostnode] removed stale vendor/${file}`)
  }
}

const nextPkg = currentPkg.replace(dependencyPattern, `$1${dependency}$2`)
if (nextPkg !== currentPkg) {
  writeFileSync(amoxtliPkgPath, nextPkg)
  console.log(`[sync:almostnode] package.json → ${dependency}`)
}
else {
  console.log(`[sync:almostnode] package.json already points at ${dependency}`)
}

if (shouldInstall) {
  console.log('[sync:almostnode] installing')
  run('pnpm', ['install'], root)
}
else {
  console.log('[sync:almostnode] skipped install (--skip-install)')
}

writeFileSync(statePath, `${JSON.stringify({
  name: sourcePkg.name,
  version: sourcePkg.version,
  tarball,
  hash,
}, null, 2)}\n`)
