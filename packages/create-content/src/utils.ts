import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'

export function getRoot(): string { return process.cwd() }
export function getContentDir(): string { return join(getRoot(), 'content') }
export const LOCALES = ['en', 'es_mx'] as const
export type Locale = (typeof LOCALES)[number]

export interface DirEntry {
  dir: string
  num: number
  title: string
  path: string
}

export function padNumber(n: number): string {
  return String(n).padStart(2, '0')
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function parseDirNumber(dir: string): { num: number, rest: string } | null {
  const match = dir.match(/^(\d{2})\.(.+)$/)
  if (!match)
    return null
  return { num: Number(match[1]), rest: match[2] }
}

export function getNextNumber(parentDir: string): number {
  if (!existsSync(parentDir))
    return 1
  const entries = readdirSync(parentDir, { withFileTypes: true })
  const numbers = entries
    .filter(e => e.isDirectory())
    .map(e => parseDirNumber(e.name))
    .filter((n): n is { num: number, rest: string } => n !== null)
    .map(n => n.num)
  return numbers.length > 0 ? Math.max(...numbers) + 1 : 1
}

export function getLocales(): Locale[] {
  if (!existsSync(getContentDir()))
    return [...LOCALES]
  return readdirSync(getContentDir(), { withFileTypes: true })
    .filter(e => e.isDirectory() && LOCALES.includes(e.name as Locale))
    .map(e => e.name as Locale)
}

export function getChapters(locale: string): DirEntry[] {
  const dir = join(getContentDir(), locale)
  if (!existsSync(dir))
    return []
  return readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map((e) => {
      const parsed = parseDirNumber(e.name)
      return parsed
        ? { dir: e.name, num: parsed.num, title: parsed.rest.replace(/-/g, ' '), path: join(dir, e.name) }
        : null
    })
    .filter((e): e is DirEntry => e !== null)
    .sort((a, b) => a.num - b.num)
}

export function getChaptersFlat(locale: string): { label: string, value: string }[] {
  return getChapters(locale).map(c => ({
    label: `${padNumber(c.num)}. ${c.title}`,
    value: c.dir,
  }))
}

export function getLessons(locale: string, chapter: string): DirEntry[] {
  const dir = join(getContentDir(), locale, chapter)
  if (!existsSync(dir))
    return []
  return readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map((e) => {
      const parsed = parseDirNumber(e.name)
      return parsed
        ? { dir: e.name, num: parsed.num, title: parsed.rest.replace(/-/g, ' '), path: join(dir, e.name) }
        : null
    })
    .filter((e): e is DirEntry => e !== null)
    .sort((a, b) => a.num - b.num)
}

export function getAllLessonsFlat(locale: string, chapter?: string): { label: string, value: string }[] {
  const chapters = chapter ? getChapters(locale).filter(c => c.dir === chapter) : getChapters(locale)
  const items: { label: string, value: string }[] = []
  for (const ch of chapters) {
    const lessons = getLessons(locale, ch.dir)
    for (const l of lessons) {
      items.push({
        label: `${ch.dir}/${l.dir}`,
        value: `${ch.dir}/${l.dir}`,
      })
    }
  }
  return items
}

export function generateIndexTs(template: string, sessionName: string): string {
  if (template === 'none') {
    return `import type { GuideMeta } from '~/types/guides'

export const meta: GuideMeta = {
  features: {
    defaultLayout: 'docs',
  },
  sessionName: '${sessionName}',
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
    fileTree: true,
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

export function getStubFileName(template: string): string {
  if (template === 'html')
    return 'index.html'
  return 'src/App.vue'
}

export function getStubContent(template: string): string {
  if (template === 'html') {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hello World</title>
</head>
<body>
  <div id="app">
    <h1>Hello World!</h1>
  </div>
  <script type="module">
    const message = 'Hello World!'
    document.querySelector('#app').innerHTML = message
  </script>
</body>
</html>
`
  }

  const styleBlock = template === 'vue-sass'
    ? '<style lang="scss">\n\n</style>\n'
    : '<style>\n\n</style>\n'

  return `<script setup lang="ts">
const message = 'Hello World!'
</script>

<template>
  <div>
    <h1>{{ message }}</h1>
  </div>
</template>

${styleBlock}`
}

export function getChapterIndexMd(title: string): string {
  return `---
title: "${title}"
ogImage: true
---
`
}

export function getLessonIndexMd(title: string): string {
  return `---
title: "${title}"
ogImage: true
---
`
}

export function hasTemplateDir(lessonPath: string): boolean {
  return existsSync(join(lessonPath, '.template'))
}

export function hasFilesDir(lessonPath: string): boolean {
  return existsSync(join(lessonPath, '.template', 'files'))
}

export function copyDir(src: string, dest: string) {
  mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    }
    else {
      mkdirSync(dirname(destPath), { recursive: true })
      cpSync(srcPath, destPath)
    }
  }
}

export function countFiles(dir: string): number {
  if (!existsSync(dir))
    return 0
  let count = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      count += countFiles(join(dir, entry.name))
    }
    else {
      count++
    }
  }
  return count
}

export function detectTemplateFromIndex(lessonPath: string): string {
  const indexPath = join(lessonPath, '.template', 'index.ts')
  if (!existsSync(indexPath))
    return 'vue'
  try {
    const content = readFileSync(indexPath, 'utf-8')
    const match = content.match(/template:\s*'([\w-]+)'/)
    if (match && ['vue', 'html', 'vue-sass'].includes(match[1])) {
      return match[1]
    }
    return 'vue'
  }
  catch {
    return 'vue'
  }
}

export function listFilesDir(dir: string): string[] {
  if (!existsSync(dir))
    return []
  const files: string[] = []
  function walk(current: string, prefix: string) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) {
        walk(join(current, entry.name), rel)
      }
      else {
        files.push(rel)
      }
    }
  }
  walk(dir, '')
  return files.sort()
}
