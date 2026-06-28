import { describe, it, expect } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdtempSync } from 'node:fs'

import {
  detectTemplateFromIndex,
  listFilesDir,
} from '../src/utils.ts'

describe('detectTemplateFromIndex', () => {
  it('detects vue template', () => {
    const dir = mkdtempSync(join(tmpdir(), 'detect-'))
    mkdirSync(join(dir, '.template'), { recursive: true })
    writeFileSync(join(dir, '.template', 'index.ts'), `
import type { GuideMeta } from '~/types/guides'
export const meta: GuideMeta = {
  template: 'vue',
  startingFile: 'src/App.vue',
  features: { defaultLayout: 'split', fileTree: false, terminal: true },
  ignoredFiles: ['package.json'],
  sessionName: 'test',
}
`)
    expect(detectTemplateFromIndex(dir)).toBe('vue')
    rmSync(dir, { recursive: true, force: true })
  })

  it('detects html template', () => {
    const dir = mkdtempSync(join(tmpdir(), 'detect-'))
    mkdirSync(join(dir, '.template'), { recursive: true })
    writeFileSync(join(dir, '.template', 'index.ts'), `
export const meta = {
  template: 'html',
  startingFile: 'index.html',
}
`)
    expect(detectTemplateFromIndex(dir)).toBe('html')
    rmSync(dir, { recursive: true, force: true })
  })

  it('detects vue-sass template', () => {
    const dir = mkdtempSync(join(tmpdir(), 'detect-'))
    mkdirSync(join(dir, '.template'), { recursive: true })
    writeFileSync(join(dir, '.template', 'index.ts'), `
export const meta = {
  template: 'vue-sass',
}
`)
    expect(detectTemplateFromIndex(dir)).toBe('vue-sass')
    rmSync(dir, { recursive: true, force: true })
  })

  it('returns vue as default for docs-only (no template field)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'detect-'))
    mkdirSync(join(dir, '.template'), { recursive: true })
    writeFileSync(join(dir, '.template', 'index.ts'), `
export const meta = {
  features: { defaultLayout: 'docs' },
}
`)
    expect(detectTemplateFromIndex(dir)).toBe('vue')
    rmSync(dir, { recursive: true, force: true })
  })

  it('returns vue as fallback when no .template exists', () => {
    const dir = mkdtempSync(join(tmpdir(), 'detect-'))
    expect(detectTemplateFromIndex(dir)).toBe('vue')
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('listFilesDir', () => {
  it('returns empty for non-existent dir', () => {
    expect(listFilesDir('/nonexistent/path')).toEqual([])
  })

  it('lists files recursively', () => {
    const dir = mkdtempSync(join(tmpdir(), 'listfiles-'))
    mkdirSync(join(dir, 'sub'), { recursive: true })
    writeFileSync(join(dir, 'a.txt'), '')
    writeFileSync(join(dir, 'sub', 'b.js'), '')
    writeFileSync(join(dir, 'sub', 'c.ts'), '')

    const result = listFilesDir(dir)
    expect(result).toHaveLength(3)
    expect(result).toContain('a.txt')
    expect(result).toContain('sub/b.js')
    expect(result).toContain('sub/c.ts')
    rmSync(dir, { recursive: true, force: true })
  })

  it('returns sorted paths', () => {
    const dir = mkdtempSync(join(tmpdir(), 'listsorted-'))
    writeFileSync(join(dir, 'z.txt'), '')
    writeFileSync(join(dir, 'a.txt'), '')

    const result = listFilesDir(dir)
    expect(result).toEqual(['a.txt', 'z.txt'])
    rmSync(dir, { recursive: true, force: true })
  })

  it('returns empty for empty directory', () => {
    const dir = mkdtempSync(join(tmpdir(), 'listempty-'))
    expect(listFilesDir(dir)).toEqual([])
    rmSync(dir, { recursive: true, force: true })
  })
})
