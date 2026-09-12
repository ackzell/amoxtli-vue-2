import { describe, expect, it } from 'vitest'
import { parseChangelog } from '../lib/changelog/parse'

const SAMPLE = `# Changelog

Intro paragraph that should be ignored.

## [0.3.0](https://github.com/ackzell/amoxtli-vue-2/compare/v0.2.5...v0.3.0) (2026-09-12)

### Features

* add first challenge validation support ([129fed0](https://github.com/ackzell/amoxtli-vue-2/commit/129fed0fa8a8c798eb649717d321825ce61a43a3))
* **challenge:** retake flow, non-destructive solution peek ([a3c0f6b](https://github.com/ackzell/amoxtli-vue-2/commit/a3c0f6b103562aef2026f74a809da951009e5825))
* realign es_mx chapters with en 05-07 ([f0720ad](https://github.com/ackzell/amoxtli-vue-2/commit/f0720ad08e5a48673c3cae6b4aa126ede9efccaf))

### Bug Fixes

* apply challenge + dark params once iframe is available ([ed2c1be](https://github.com/ackzell/amoxtli-vue-2/commit/ed2c1be3dab306b480c3b3abdaf5f31c6fb164b7))

## [0.2.5](https://github.com/ackzell/amoxtli-vue-2/compare/v0.2.4...v0.2.5) (2026-08-21)

## 0.1.7 (2026-06-13)

### Features

* add basic i18n support  ([5574fe0](https://github.com/ackzell/amoxtli-vue-2/commit/5574fe0539d0192652e13bcda2a81b604ec8a9e0))
* add birpc for communication ([3818f93](https://github.com/ackzell/amoxtli-vue-2/commit/3818f938ba1d6705f397f218c7577102959acc41)), closes [#39](https://github.com/ackzell/amoxtli-vue-2/issues/39)
* assign default value to ui state, fix [#95](https://github.com/ackzell/amoxtli-vue-2/issues/95) ([9f0d0a2](https://github.com/ackzell/amoxtli-vue-2/commit/9f0d0a25f11a4889b26054b7ea4a1eaf60f7a857))
`

describe('parseChangelog', () => {
  it('parses releases in order, dropping preamble and empty sections', () => {
    const releases = parseChangelog(SAMPLE)
    expect(releases.map(r => r.version)).toEqual(['0.3.0', '0.1.7'])
  })

  it('parses version headers with compare url and date', () => {
    const [release] = parseChangelog(SAMPLE)
    expect(release!.version).toBe('0.3.0')
    expect(release!.date).toBe('2026-09-12')
    expect(release!.compareUrl).toContain('compare/v0.2.5...v0.3.0')
  })

  it('parses bare headers without url', () => {
    const [, release] = parseChangelog(SAMPLE)
    expect(release!.version).toBe('0.1.7')
    expect(release!.date).toBe('2026-06-13')
    expect(release!.compareUrl).toBeUndefined()
  })

  it('skips releases with no sections or items', () => {
    const releases = parseChangelog(SAMPLE)
    expect(releases.some(r => r.version === '0.2.5')).toBe(false)
  })

  it('keeps section headings and groups items', () => {
    const [release] = parseChangelog(SAMPLE)
    const features = release!.sections.find(s => s.heading === 'Features')!
    expect(features.items).toHaveLength(3)
    expect(release!.sections.find(s => s.heading === 'Bug Fixes')!.items).toHaveLength(1)
  })

  it('extracts scope from **scope:** prefix', () => {
    const [release] = parseChangelog(SAMPLE)
    const features = release!.sections.find(s => s.heading === 'Features')!
    expect(features.items[1]!.scope).toBe('challenge')
    expect(features.items[1]!.text).toBe('retake flow, non-destructive solution peek')
    expect(features.items[0]!.scope).toBeUndefined()
  })

  it('extracts commit hashes with urls', () => {
    const [release] = parseChangelog(SAMPLE)
    const item = release!.sections.find(s => s.heading === 'Features')!.items[0]!
    expect(item.commits).toEqual([{
      short: '129fed0',
      url: 'https://github.com/ackzell/amoxtli-vue-2/commit/129fed0fa8a8c798eb649717d321825ce61a43a3',
    }])
  })

  it('strips closing/issue references from old-style items', () => {
    const [, release] = parseChangelog(SAMPLE)
    const items = release!.sections.find(s => s.heading === 'Features')!.items
    expect(items[1]!.text).toBe('add birpc for communication')
    expect(items[2]!.text).toBe('assign default value to ui state')
    expect(items[2]!.commits[0]!.short).toBe('9f0d0a2')
  })

  it('returns empty array for empty input', () => {
    expect(parseChangelog('')).toEqual([])
    expect(parseChangelog('# no releases here')).toEqual([])
  })
})
