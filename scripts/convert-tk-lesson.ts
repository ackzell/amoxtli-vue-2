#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import yaml from 'js-yaml'

interface Args {
  source: string
  target: string
  template: 'vue' | 'html' | 'vue-sass'
  dryRun: boolean
}

// ── CLI ───────────────────────────────────────────────
function parseArgs(): Args {
  const args = process.argv.slice(2)
  const result: Args = { source: '', target: '', template: 'vue', dryRun: false }
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--source':
        result.source = args[++i]
        break
      case '--target':
        result.target = args[++i]
        break
      case '--template':
        result.template = args[++i] as Args['template']
        break
      case '--dry-run':
        result.dryRun = true
        break
    }
  }
  if (!result.source || !result.target) {
    console.error('Usage: convert-tk-lesson --source <path> --target <path> [--template vue|html|vue-sass] [--dry-run]')
    process.exit(1)
  }
  return result
}

// ── Helpers ───────────────────────────────────────────
function log(...args: any[]) {
  console.log('[tk-convert]', ...args)
}

function findContentFile(dir: string): string | null {
  for (const name of ['content.md', 'content.mdx']) {
    const full = join(dir, name)
    if (existsSync(full))
      return full
  }
  return null
}

const SKIP_FILES = new Set(['yv-lesson.json', '.DS_Store'])

// ── Frontmatter ───────────────────────────────────────
function parseFrontmatter(content: string): { data: Record<string, any>, body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n(?:---|\.\.\.)\n/)
  if (!match)
    return { data: {}, body: content }
  const data = yaml.load(match[1]) as Record<string, any>
  const body = content.slice(match[0].length)
  return { data, body }
}

function transformFrontmatter(data: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  if (data.title)
    out.title = data.title
  out.ogImage = true
  return out
}

function stringifyFrontmatter(data: Record<string, any>): string {
  return `---\n${yaml.dump(data, { lineWidth: -1 }).trim()}\n---`
}

// ── Code-block protection ────────────────────────────
const CB_PREFIX = '__TK_CB_'

function protectCodeBlocks(text: string): { clean: string, blocks: string[] } {
  const blocks: string[] = []
  const clean = text.replace(/```[\s\S]*?```/g, (m) => {
    blocks.push(m)
    return `${CB_PREFIX}${blocks.length - 1}__`
  })
  return { clean, blocks }
}

function restoreCodeBlocks(text: string, blocks: string[]): string {
  return text.replace(new RegExp(`${CB_PREFIX}(\\d+)__`, 'g'), (_, n) => blocks[Number(n)] ?? '')
}

// ── Content transformers ─────────────────────────────

/** Remove JS/TS import lines at the top of the file */
function removeImports(body: string): string {
  return body
    .replace(/^import\s+(?:\S.*?)??['"][^'"]+['"]\s*(?:;\s*)?$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
}

/** <AvTooltipContent id="x">…</AvTooltipContent> → ::tooltip-content{id="x"}…:: */
function transformAvTooltipContent(body: string): string {
  let result = body
  const re = /<AvTooltipContent\s+id="([^"]+)">/g
  let m: RegExpExecArray | null
  while ((m = re.exec(result)) !== null) {
    const id = m[1]
    const openEnd = m.index + m[0].length
    const closeIdx = result.indexOf('</AvTooltipContent>', openEnd)
    if (closeIdx === -1)
      continue
    const inner = result.slice(openEnd, closeIdx).trim()
    const blockEnd = closeIdx + '</AvTooltipContent>'.length

    const cleaned = inner
      .replace(/^:::\w*\s*\n/, '')
      .replace(/\n:::$/, '')
      .trim()

    const replacement = `::tooltip-content{id="${id}"}\n${cleaned}\n::`
    result = result.slice(0, m.index) + replacement + result.slice(blockEnd)
    re.lastIndex = m.index + replacement.length
  }
  return result
}

/** <AvTooltipTrigger id="x">text</AvTooltipTrigger> → :tooltip-trigger{id="x"}[text] */
function transformAvTooltipTrigger(body: string): string {
  return body.replace(
    /<AvTooltipTrigger\s+id="([^"]+)">([^<]*)<\/AvTooltipTrigger>/g,
    (_, id, text) => `:tooltip-trigger{id="${id}"}[${text.trim()}]`,
  )
}

/** <ToggleLessonStateButton … /> → <ButtonShowSolution /> */
function transformToggleLessonStateButton(body: string): string {
  return body.replace(/<ToggleLessonStateButton[^>]*>/g, '<ButtonShowSolution />')
}

/** <YouTubeEmbed …>…</YouTubeEmbed> → ::YouTubePlayer{…}…:: */
function transformYouTubeEmbed(body: string): string {
  let result = body
  let idx = 0
  while (true) {
    const start = result.indexOf('<YouTubeEmbed', idx)
    if (start === -1)
      break
    const gtIdx = result.indexOf('>', start)
    if (gtIdx === -1)
      break
    const openTag = result.slice(start, gtIdx + 1)

    const id = openTag.match(/id="([^"]+)"/)?.[1] ?? ''
    const title = openTag.match(/title="([^"]+)"/)?.[1] ?? ''
    const duration = openTag.match(/duration="([^"]+)"/)?.[1] ?? ''

    // self-closing?
    if (openTag.trim().endsWith('/>')) {
      const repl = `::YouTubePlayer{videoId="${id}" title="${title}" duration="${duration}"}`
      result = result.slice(0, start) + repl + result.slice(gtIdx + 1)
      idx = start + repl.length
      continue
    }

    const end = result.indexOf('</YouTubeEmbed>', gtIdx)
    if (end === -1)
      break
    const inner = result.slice(gtIdx + 1, end).trim()
    const blockEnd = end + '</YouTubeEmbed>'.length

    const repl = `::YouTubePlayer{videoId="${id}" title="${title}" duration="${duration}"}\n${inner}\n::`
    result = result.slice(0, start) + repl + result.slice(blockEnd)
    idx = start + repl.length
  }
  return result
}

/** Convert remaining triple‑colon containers to double‑colon MDC */
function transformTripleColon(body: string): string {
  return body.replace(/^:::/gm, '::')
}

/** Update file: references to include src/ for vue templates */
function transformFilePath(body: string, template: string): string {
  if (template !== 'vue' && template !== 'vue-sass')
    return body
  return body.replace(/(```\s*file:)\/(?!src\/)([^\s"'}]+)/g, '$1/src/$2')
}

/** Ensure empty fenced code blocks have a `-` body so Nuxt Content doesn't strip them */
function ensureNonEmptyFences(body: string): string {
  return body.replace(/^(```\w[^\n]*)\n\s*^(```)$/gm, '$1\n-\n$2')
}

// ── File copying ─────────────────────────────────────
function copyLessonFiles(
  sourceDir: string,
  targetDir: string,
  template: string,
) {
  function walk(dir: string, relPath: string) {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (SKIP_FILES.has(entry.name))
        continue
      const full = join(dir, entry.name)
      const entryRel = relPath ? join(relPath, entry.name) : entry.name
      if (entry.isDirectory()) {
        walk(full, entryRel)
      }
      else {
        const targetRel
          = template === 'vue' || template === 'vue-sass'
            ? join('src', entryRel)
            : entryRel
        const targetPath = join(targetDir, targetRel)
        mkdirSync(dirname(targetPath), { recursive: true })
        cpSync(full, targetPath)
        log(`  Copied: ${entryRel} → ${targetRel}`)
      }
    }
  }
  walk(sourceDir, '')
}

function hasRealFiles(dir: string): boolean {
  if (!existsSync(dir))
    return false
  return readdirSync(dir).some(e => !SKIP_FILES.has(e))
}

// ── .template/index.ts generator ─────────────────────
function generateIndexTs(opts: {
  template: string
  hasFiles: boolean
  sessionName: string
}): string {
  const { template, hasFiles, sessionName } = opts

  if (!hasFiles) {
    return `import type { GuideMeta } from '~/types/guides'

export const meta: GuideMeta = {
  features: {
    defaultLayout: 'docs',
  },
}
`
  }

  if (template === 'html') {
    return `import type { GuideMeta } from '~/types/guides'

export const meta: GuideMeta = {
  template: 'html',
  startingFile: 'index.html',
  features: {
    defaultLayout: 'split',
    terminal: false,
    fileTree: false,
  },
  ignoredFiles: ['package.json', 'main.js', 'style.css', 'server.js'],
  sessionName: '${sessionName}',
}
`
  }

  return `import type { GuideMeta } from '~/types/guides'

export const meta: GuideMeta = {
  template: '${template}',
  startingFile: 'src/App.vue',
  features: {
    defaultLayout: 'split',
    fileTree: false,
    terminal: true,
  },
  ignoredFiles: ['package.json', 'main.js', 'tsconfig.node.json', 'vite.config.ts', 'App.vue', 'index.html', 'src/main.ts'],
  sessionName: '${sessionName}',
}
`
}

// ── Main ──────────────────────────────────────────────
function main() {
  const args = parseArgs()
  log(`Source: ${args.source}`)
  log(`Target: ${args.target}`)
  log(`Template: ${args.template}`)
  log(`Dry run: ${args.dryRun}`)

  // 1. Locate content file
  const contentFile = findContentFile(args.source)
  if (!contentFile) {
    console.error('Error: no content.md or content.mdx found')
    process.exit(1)
  }
  log(`Content: ${basename(contentFile)}`)

  const raw = readFileSync(contentFile, 'utf-8')

  // 2. Frontmatter
  const { data: fm, body } = parseFrontmatter(raw)
  const sessionName = fm?.slug ?? basename(args.source)
  const newFm = transformFrontmatter(fm ?? {})
  log(`Title: ${newFm.title ?? '(none)'}`)
  log(`Session: ${sessionName}`)

  // 3. Transform body
  // 3a. Update file: paths (vue template: /App.vue → /src/App.vue)
  //     Must run BEFORE code-block protection since file: lives in fence lang
  let t = transformFilePath(body, args.template)

  // 3b. Protect fenced code blocks so subsequent transformers don't trip on their content
  const { clean, blocks } = protectCodeBlocks(t)

  t = clean
  t = removeImports(t)
  t = transformAvTooltipContent(t)
  t = transformYouTubeEmbed(t)
  t = transformAvTooltipTrigger(t)
  t = transformToggleLessonStateButton(t)
  t = transformTripleColon(t)

  // 3c. Restore code blocks
  t = restoreCodeBlocks(t, blocks)

  // 3d. Ensure empty fences have a `-` body (Nuxt Content drops empty fences)
  t = ensureNonEmptyFences(t)

  const bodyFinal = t.trim()

  // 4. Assemble
  const output = `${stringifyFrontmatter(newFm)}\n\n${bodyFinal}\n`

  if (args.dryRun) {
    log('=== DRY RUN — transformed content ===\n')
    console.log(output)
    return
  }

  // 5. Write target files
  mkdirSync(args.target, { recursive: true })

  writeFileSync(join(args.target, 'index.md'), output)
  log(`Written: ${join(args.target, 'index.md')}`)

  // 6. Copy _files/
  const srcFiles = join(args.source, '_files')
  const tgtFiles = join(args.target, '.template', 'files')
  if (hasRealFiles(srcFiles)) {
    log('Copying _files/ …')
    copyLessonFiles(srcFiles, tgtFiles, args.template)
  }

  // 7. Copy _solution/
  const srcSols = join(args.source, '_solution')
  const tgtSols = join(args.target, '.template', 'solutions')
  if (hasRealFiles(srcSols)) {
    log('Copying _solution/ …')
    copyLessonFiles(srcSols, tgtSols, args.template)
  }

  // 8. Generate .template/index.ts
  const hasFiles = hasRealFiles(srcFiles)
  const indexTs = generateIndexTs({ template: args.template, hasFiles, sessionName })
  const tmplDir = join(args.target, '.template')
  mkdirSync(tmplDir, { recursive: true })
  writeFileSync(join(tmplDir, 'index.ts'), indexTs)
  log(`Written: ${join(tmplDir, 'index.ts')}`)

  log('✓ Done')
}

main()
