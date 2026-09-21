import { Buffer } from 'node:buffer'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'
import { parseEcInfo } from '~/composables/useEcParser'

import {
  autoInjectChallengeCheck,
  encodeAnnotations,
  encodeCollapse,
  encodeMarkers,
  inferLangFromFilePath,
  inlineTemplateFiles,
  normalizeVueDiffFences,
  wrapLiveBlocks,
} from './content-transforms'
import { encodeHex, encodeMarkerToken } from './ec-tokens'

const FENCE = '```'

describe('normalizeVueDiffFences', () => {
  it('rewrites {lang}-diff fences to {lang} diff', () => {
    expect(normalizeVueDiffFences(`${FENCE}vue-diff\n+x\n`)).toBe(`${FENCE}vue diff\n+x\n`)
    expect(normalizeVueDiffFences(`${FENCE}html-diff\n<p></p>\n`)).toBe(`${FENCE}html diff\n<p></p>\n`)
  })

  it('preserves rest tokens on the fence line', () => {
    const body = `${FENCE}vue-diff {"note":3}\n`
    expect(normalizeVueDiffFences(body)).toBe(`${FENCE}vue diff {"note":3}\n`)
  })

  it('leaves non-diff fences untouched', () => {
    const body = `${FENCE}vue\nconst x = 1\n${FENCE}\n`
    expect(normalizeVueDiffFences(body)).toBe(body)
  })
})

describe('inferLangFromFilePath', () => {
  it('infers language from the file path extension', () => {
    expect(inferLangFromFilePath(`${FENCE}file:/src/App.vue\n`)).toBe(`${FENCE}vue file:/src/App.vue\n`)
    expect(inferLangFromFilePath(`${FENCE}file:/App.ts\n`)).toBe(`${FENCE}typescript file:/App.ts\n`)
    expect(inferLangFromFilePath(`${FENCE}solution:/solver.js\n`)).toBe(`${FENCE}javascript solution:/solver.js\n`)
  })

  it('leaves unknown extensions untouched', () => {
    const body = `${FENCE}file:/App.novel\n`
    expect(inferLangFromFilePath(body)).toBe(body)
  })

  it('leaves ordinary fences untouched', () => {
    const body = `${FENCE}vue\n`
    expect(inferLangFromFilePath(body)).toBe(body)
  })
})

describe('encodeAnnotations', () => {
  it('encodes a ranged annotation into an EANN token', () => {
    const body = `${FENCE}vue {"One handler to update the name":4-8}\n`
    expect(encodeAnnotations(body)).toBe(
      `${FENCE}vue __EANN_${encodeHex('One handler to update the name')}_L_${encodeHex('4-8')}__\n`,
    )
  })

  it('encodes multiple annotations sharing one opening fence', () => {
    const body = `${FENCE}vue {"A":4-8} {"B":10-17} {"C":5}\n`
    const result = encodeAnnotations(body)
    expect(result).toContain(`__EANN_${encodeHex('A')}_L_${encodeHex('4-8')}__`)
    expect(result).toContain(`__EANN_${encodeHex('B')}_L_${encodeHex('10-17')}__`)
    expect(result).toContain(`__EANN_${encodeHex('C')}_L_${encodeHex('5')}__`)
  })

  it('encodes a bare {"text"} label into an ELBL token', () => {
    const body = `${FENCE}vue {"hello"}\n`
    expect(encodeAnnotations(body)).toBe(`${FENCE}vue __ELBL_${encodeHex('hello')}__\n`)
  })

  it('trims trailing space before a single-line annotation', () => {
    const body = `${FENCE}vue {"Render it": 23}\n`
    expect(encodeAnnotations(body)).toContain(`__EANN_${encodeHex('Render it')}_L_${encodeHex('23')}__`)
  })

  it('leaves plain fences untouched', () => {
    const body = `${FENCE}vue\n`
    expect(encodeAnnotations(body)).toBe(body)
  })
})

describe('encodeMarkers', () => {
  it('encodes quoted markers to ECPT tokens', () => {
    const body = `${FENCE}vue "handleClick"  "updateName"\n`
    expect(encodeMarkers(body)).toBe(
      `${FENCE}vue ${encodeMarkerToken('"handleClick"')}  ${encodeMarkerToken('"updateName"')}\n`,
    )
  })

  it('shields title values so inner quotes are not confused with markers', () => {
    const body = `${FENCE}js title="called 'useGreeter'"\n`
    expect(encodeMarkers(body)).toBe(body)
  })

  it('encodes special-character markers like "@click="', () => {
    const body = `${FENCE}vue title="App.vue" "@click="\n`
    expect(encodeMarkers(body)).toBe(`${FENCE}vue title="App.vue" ${encodeMarkerToken('"@click="')}\n`)
  })

  it('encodes slash regex markers', () => {
    const body = `${FENCE}ts /v-model/\n`
    expect(encodeMarkers(body)).toBe(`${FENCE}ts ${encodeMarkerToken('/v-model/')}\n`)
  })
})

describe('encodeCollapse', () => {
  it('replaces collapse braces with an ECOL token', () => {
    expect(encodeCollapse(`${FENCE}vue collapse={16-33}\n`)).toBe(`${FENCE}vue collapse=__ECOL_16-33__\n`)
  })

  it('keeps comma-separated ranges including spaces', () => {
    expect(encodeCollapse(`${FENCE}vue collapse={1-4, 12-20}\n`))
      .toBe(`${FENCE}vue collapse=__ECOL_1-4, 12-20__\n`)
  })
})

describe('wrapLiveBlocks', () => {
  it('wraps a vue live block with defaults', () => {
    const body = `${FENCE}vue live\n<template><h1>hi</h1></template>\n${FENCE}\n`
    const b64 = Buffer.from('<template><h1>hi</h1></template>\n').toString('base64')
    expect(wrapLiveBlocks(body)).toBe(`:vue-live{code="${b64}" lang="vue"}\n`)
  })

  it('honors hide and show* overrides', () => {
    const body = `${FENCE}vue live hide={2-5} showLineNumbers={false} showPreview={false}\nx\n${FENCE}\n`
    const b64 = Buffer.from('x\n').toString('base64')
    expect(wrapLiveBlocks(body)).toBe(
      `:vue-live{code="${b64}" lang="vue" hide="2-5" :showLineNumbers="false" :showPreview="false"}\n`,
    )
  })

  it('flags truthy bare options like showConsole without a value', () => {
    const body = `${FENCE}vue live showConsole hide={13-32} showLineNumbers\nx\n${FENCE}\n`
    const b64 = Buffer.from('x\n').toString('base64')
    expect(wrapLiveBlocks(body)).toBe(
      `:vue-live{code="${b64}" lang="vue" hide="13-32" :showLineNumbers="true" :showConsole="true"}\n`,
    )
  })

  it('selects html-live for html fences', () => {
    const body = `${FENCE}html live\n<h1>x</h1>\n${FENCE}\n`
    const b64 = Buffer.from('<h1>x</h1>\n').toString('base64')
    expect(wrapLiveBlocks(body)).toBe(`:html-live{code="${b64}" lang="html"}\n`)
  })
})

describe('inlineTemplateFiles', () => {
  const roots: string[] = []

  const makeRoot = () => {
    const root = mkdtempSync(join(tmpdir(), 'amv-transforms-'))
    roots.push(root)
    return root
  }

  const makeLesson = () => {
    const root = makeRoot()
    mkdirSync(join(root, '.template', 'files'), { recursive: true })
    mkdirSync(join(root, '.template', 'solutions'), { recursive: true })
    return root
  }

  afterEach(() => {
    for (const root of roots.splice(0))
      rmSync(root, { recursive: true, force: true })
  })

  it('is a no-op when the lesson has no .template directory', () => {
    const root = makeRoot()
    const body = `${FENCE}file:/App.vue\n\n${FENCE}\n`
    expect(inlineTemplateFiles(body, root)).toBe(body)
  })

  it('inlines a full file block from .template/files', () => {
    const root = makeLesson()
    const content = '  <h1 v-on:click="log">Hello</h1>\n'
    writeFileSync(join(root, '.template', 'files', 'App.vue'), content)
    expect(inlineTemplateFiles(`${FENCE}file:/App.vue\n\n${FENCE}\n`, root))
      .toBe(`${FENCE} file:/App.vue\n${content.trimEnd()}\n${FENCE}\n`)
  })

  it('honors extract={...} ranges and blank-line breaks', () => {
    const root = makeLesson()
    writeFileSync(join(root, '.template', 'files', 'input.ts'), 'line1\nline2\nline3\nline4\nline5\n')
    expect(inlineTemplateFiles(`${FENCE}file:/input.ts extract={1-2,[1]}\n\n${FENCE}\n`, root))
      .toBe(`${FENCE} file:/input.ts extract={1-2,[1]}\nline1\nline2\n\n${FENCE}\n`)
  })

  it('encodes non-file fence titles into ETIT tokens and round-trips through parseEcInfo', () => {
    const root = makeLesson()
    const title = 'Called "x"'
    const body = `${FENCE}vue title="Called \\"x\\""\n\n${FENCE}\n`
    const out = inlineTemplateFiles(body, root)
    expect(out).toContain(`title=__ETIT_${encodeHex(title)}__`)
    const meta = out.split('\n')[0]!.replace(/^`{3}\S*\s?/, '')
    expect(parseEcInfo(meta).title).toBe(title)
  })
})

describe('autoInjectChallengeCheck', () => {
  const roots: string[] = []

  const makeLesson = (indexTs: string | null) => {
    const root = mkdtempSync(join(tmpdir(), 'amv-transforms-'))
    roots.push(root)
    mkdirSync(join(root, '.template', 'files'), { recursive: true })
    if (indexTs !== null)
      writeFileSync(join(root, '.template', 'index.ts'), indexTs)
    return root
  }

  afterEach(() => {
    for (const root of roots.splice(0))
      rmSync(root, { recursive: true, force: true })
  })

  it('injects ::challenge-check when the lesson defines a validation suite', () => {
    const root = makeLesson('export const validation: { challenge: "tick" }\n')
    expect(autoInjectChallengeCheck('## Lesson\n', root)).toBe('## Lesson\n\n::challenge-check\n')
  })

  it('does not inject without a validation suite', () => {
    const root = makeLesson('export const foo = 1\n')
    const body = '## Lesson\n'
    expect(autoInjectChallengeCheck(body, root)).toBe(body)
  })

  it('does not inject when the author placed ::challenge-check manually', () => {
    const root = makeLesson('export const validation: { challenge: "tick" }\n')
    const body = '## Lesson\n::challenge-check\n'
    expect(autoInjectChallengeCheck(body, root)).toBe(body)
  })

  it('does not inject when there is no .template directory', () => {
    const root = mkdtempSync(join(tmpdir(), 'amv-transforms-'))
    roots.push(root)
    const body = '## Lesson\n'
    expect(autoInjectChallengeCheck(body, root)).toBe(body)
    expect(existsSync(join(root, '.template'))).toBe(false)
  })
})

describe('integration — full fence-meta chain round-trips through parseEcInfo', () => {
  function fenceMetaChain(body: string) {
    let out = normalizeVueDiffFences(body)
    out = inferLangFromFilePath(out)
    out = encodeAnnotations(out)
    out = encodeMarkers(out)
    out = encodeCollapse(out)
    return out
  }

  it('parses a realistic lesson fence back to its authored structure', () => {
    const meta = 'title="Computed vs Method" {"the v-if will force the rerender":37} "isDisplayed"'
      + ' collapse={9-13, 18-22, 27-36}'
      + ' {"Executes the method every time the div is added to the DOM + message changes":42}'
      + ' {"Executes the getter callback from the computed only when message changes":49}'

    const encoded = fenceMetaChain(`${FENCE}vue ${meta}`)
    expect(encoded.startsWith(`${FENCE}vue `)).toBe(true)
    const encodedMeta = encoded.slice(`${FENCE}vue `.length)

    const parsed = parseEcInfo(encodedMeta)
    expect(parsed.title).toBe('Computed vs Method')
    expect(parsed.annotations).toEqual([
      { text: 'the v-if will force the rerender', lines: [37] },
      { text: 'Executes the method every time the div is added to the DOM + message changes', lines: [42] },
      { text: 'Executes the getter callback from the computed only when message changes', lines: [49] },
    ])
    expect(parsed.collapseRanges).toEqual([
      { start: 9, end: 13 },
      { start: 18, end: 22 },
      { start: 27, end: 36 },
    ])
    expect(parsed.highlights).toEqual([{ pattern: 'isDisplayed', lines: undefined, plain: true }])
    expect(parsed.labels).toEqual([])
    expect(parsed.file).toBe('')
    expect(parsed.diff).toBe(false)
    expect(parsed.showLineNumbers).toBe(true)
  })

  it('normalized vue-diff fences parse with diff: true', () => {
    const encoded = normalizeVueDiffFences(`${FENCE}vue-diff\n+x\n`)
    expect(encoded.startsWith(`${FENCE}vue diff\n`)).toBe(true)
    expect(parseEcInfo('vue diff').diff).toBe(true)
  })
})
