import { describe, expect, it } from 'vitest'

import {
  encodeAnnotationToken,
  encodeCollapseToken,
  encodeLabelToken,
  encodeMarkerToken,
  encodeTitleToken,
} from '../lib/ec-tokens'
import { parseCollapseRanges, parseEcInfo, parseRanges } from './useEcParser'

describe('parseRanges', () => {
  it('parses single, ranged and comma-separated inputs', () => {
    expect(parseRanges('1')).toEqual([1])
    expect(parseRanges('1-3')).toEqual([1, 2, 3])
    expect(parseRanges('1,3')).toEqual([1, 3])
    expect(parseRanges('1-3,5,7-9')).toEqual([1, 2, 3, 5, 7, 8, 9])
  })

  it('accepts spaces around separators', () => {
    expect(parseRanges('1, 3')).toEqual([1, 3])
    expect(parseRanges('1 - 3')).toEqual([1, 2, 3])
  })

  it('normalizes reversed ranges to ascending order', () => {
    expect(parseRanges('3-1')).toEqual([1, 2, 3])
  })

  it('dedupes overlapping ranges', () => {
    expect(parseRanges('1-3,2-4')).toEqual([1, 2, 3, 4])
  })

  it('returns an empty array for empty or invalid input', () => {
    expect(parseRanges('')).toEqual([])
    expect(parseRanges('   ')).toEqual([])
    expect(parseRanges('abc')).toEqual([])
    expect(parseRanges('1-')).toEqual([1])
  })
})

describe('parseCollapseRanges', () => {
  it('parses single, ranged and multi inputs', () => {
    expect(parseCollapseRanges('1')).toEqual([{ start: 1, end: 1 }])
    expect(parseCollapseRanges('4-7,10')).toEqual([
      { start: 4, end: 7 },
      { start: 10, end: 10 },
    ])
  })

  it('normalizes reversed ranges and sorts by start', () => {
    expect(parseCollapseRanges('10,4-7,3-1')).toEqual([
      { start: 1, end: 3 },
      { start: 4, end: 7 },
      { start: 10, end: 10 },
    ])
  })

  it('skips invalid parts', () => {
    expect(parseCollapseRanges('abc,4-7')).toEqual([{ start: 4, end: 7 }])
    expect(parseCollapseRanges('')).toEqual([])
  })
})

describe('parseEcInfo — defaults', () => {
  it('returns a fully defaulted result for empty input', () => {
    expect(parseEcInfo('')).toEqual({
      file: '',
      title: '',
      showLineNumbers: true,
      collapseRanges: [],
      collapseLines: [],
      annotations: [],
      highlights: [],
      labels: [],
      diff: false,
    })
  })

  it('handles undefined input', () => {
    expect(parseEcInfo(undefined).title).toBe('')
    expect(parseEcInfo(undefined).highlights).toEqual([])
  })

  it('leaves unknown bare metas untouched without erroring', () => {
    const parsed = parseEcInfo('vue twoslash live')
    expect(parsed.title).toBe('')
    expect(parsed.diff).toBe(false)
    expect(parsed.annotations).toEqual([])
  })
})

describe('parseEcInfo — labels', () => {
  it('collects ELBL labels and strips the tokens from the working string', () => {
    const input = `${encodeLabelToken('hello')} ${encodeLabelToken('mundo')}`
    const parsed = parseEcInfo(input)
    expect(parsed.labels).toEqual(['hello', 'mundo'])
  })

  it('collects a bare {"text"} label alongside other meta', () => {
    const input = `vue ${encodeLabelToken('tip')} title="X"`
    const parsed = parseEcInfo(input)
    expect(parsed.labels).toEqual(['tip'])
    expect(parsed.title).toBe('X')
  })
})

describe('parseEcInfo — annotations', () => {
  it('round-trips EANN ranged annotations into full line sets', () => {
    const token = encodeAnnotationToken('note', '4-8')
    const parsed = parseEcInfo(`vue ${token}`)
    expect(parsed.annotations).toEqual([{ text: 'note', lines: [4, 5, 6, 7, 8] }])
  })

  it('decodes single-line EANN tokens exactly', () => {
    const token = encodeAnnotationToken('note', '5')
    expect(parseEcInfo(`vue ${token}`).annotations).toEqual([{ text: 'note', lines: [5] }])
  })

  it('round-trips non-contiguous EANN line lists and ranges', () => {
    const token = encodeAnnotationToken('annotate these lines', '3-7, 16, 24-28')
    expect(parseEcInfo(`vue ${token}`).annotations).toEqual([{
      text: 'annotate these lines',
      lines: [3, 4, 5, 6, 7, 16, 24, 25, 26, 27, 28],
    }])
  })

  it('decodes multiple EANN tokens on one fence', () => {
    const input = `vue ${encodeAnnotationToken('A', '4-8')} ${encodeAnnotationToken('B', '10-17')}`
    expect(parseEcInfo(input).annotations).toEqual([
      { text: 'A', lines: [4, 5, 6, 7, 8] },
      { text: 'B', lines: [10, 11, 12, 13, 14, 15, 16, 17] },
    ])
  })

  it('parses raw {"text":lines} annotations when encoding did not run', () => {
    expect(parseEcInfo('vue {"One handler to update the name":4-8}').annotations)
      .toEqual([{ text: 'One handler to update the name', lines: [4, 5, 6, 7, 8] }])
  })

  it('parses raw comma-separated line lists in the annotation fallback', () => {
    expect(parseEcInfo('{"a":1,3,5}').annotations).toEqual([{ text: 'a', lines: [1, 3, 5] }])
  })

  it('ignores bare quoted strings (they are highlights, not annotations)', () => {
    expect(parseEcInfo('vue "just text"').annotations).toEqual([])
  })
})

describe('parseEcInfo — file and diff flags', () => {
  it('extracts file:/solution: paths', () => {
    expect(parseEcInfo('file:/App.vue').file).toBe('/App.vue')
    expect(parseEcInfo('solution:/x.ts').file).toBe('/x.ts')
  })

  it('marks diff fences from the bare diff word', () => {
    expect(parseEcInfo('vue diff').diff).toBe(true)
    expect(parseEcInfo('vue diff twoslash').diff).toBe(true)
    expect(parseEcInfo('vue twoslash diff').diff).toBe(true)
  })

  it('does not treat lang-agnostic words as diff', () => {
    expect(parseEcInfo('vue').diff).toBe(false)
  })
})

describe('parseEcInfo — titles', () => {
  it('decodes ETIT titles containing quotes and multi-byte text', () => {
    const title = 'Called "x" — café'
    const input = `vue ${encodeTitleToken(title)}`
    expect(parseEcInfo(input).title).toBe(title)
  })

  it('parses plain title="..." metas', () => {
    expect(parseEcInfo('vue title="Computed vs Method"').title).toBe('Computed vs Method')
  })

  it('pin: the ETIT decoder consumes the preceding space', () => {
    const input = `prefix ${encodeTitleToken('t')}`
    expect(parseEcInfo(input).title).toBe('t')
  })
})

describe('parseEcInfo — collapse', () => {
  it('decodes ECOL collapse tokens', () => {
    expect(parseEcInfo(`vue ${encodeCollapseToken('16-33')}`).collapseRanges)
      .toEqual([{ start: 16, end: 33 }])
  })

  it('parses raw collapse={...} metas', () => {
    expect(parseEcInfo('vue collapse={16-33}').collapseRanges)
      .toEqual([{ start: 16, end: 33 }])
    expect(parseEcInfo('vue collapse={1-4, 12-20}').collapseRanges)
      .toEqual([
        { start: 1, end: 4 },
        { start: 12, end: 20 },
      ])
  })
})

describe('parseEcInfo — highlights', () => {
  it('parses quoted plaintext markers', () => {
    expect(parseEcInfo('vue "handleClick"').highlights)
      .toEqual([{ pattern: 'handleClick', lines: undefined, plain: true }])
  })

  it('parses single-quoted plaintext markers', () => {
    expect(parseEcInfo('vue \'isDisplayed\'').highlights)
      .toEqual([{ pattern: 'isDisplayed', lines: undefined, plain: true }])
  })

  it('parses quoted markers with an optional trailing line range', () => {
    expect(parseEcInfo('vue "x" 5-8').highlights)
      .toEqual([{ pattern: 'x', lines: [5, 6, 7, 8], plain: true }])
  })

  it('unescapes escaped quote/backslash pairs in quoted markers', () => {
    expect(parseEcInfo('vue "say \\"hi\\""').highlights)
      .toEqual([{ pattern: 'say "hi"', lines: undefined, plain: true }])
  })

  it('parses /pattern/ regex highlights', () => {
    expect(parseEcInfo('vue /v-model/').highlights)
      .toEqual([{ pattern: 'v-model', lines: undefined, plain: undefined }])
  })

  it('parses regex highlights with a line range', () => {
    expect(parseEcInfo('vue /re/ 2-3').highlights)
      .toEqual([{ pattern: 're', lines: [2, 3], plain: undefined }])
  })

  it('collects quoted markers before regex markers regardless of authoring order', () => {
    expect(parseEcInfo('vue "a" /b/ "c"').highlights).toEqual([
      { pattern: 'a', lines: undefined, plain: true },
      { pattern: 'c', lines: undefined, plain: true },
      { pattern: 'b', lines: undefined, plain: undefined },
    ])
  })

  it('decodes ECPT-shielded markers before parsing them as highlights', () => {
    const input = `vue ${encodeMarkerToken('"@click="')} ${encodeMarkerToken('/update/')}`
    expect(parseEcInfo(input).highlights).toEqual([
      { pattern: '@click=', lines: undefined, plain: true },
      { pattern: 'update', lines: undefined, plain: undefined },
    ])
  })
})

describe('parseEcInfo — showLineNumbers', () => {
  it('defaults to true', () => {
    expect(parseEcInfo('vue').showLineNumbers).toBe(true)
  })

  it('honors showLineNumbers=false', () => {
    expect(parseEcInfo('vue showLineNumbers=false').showLineNumbers).toBe(false)
  })

  it('keeps showLineNumbers=true', () => {
    expect(parseEcInfo('vue showLineNumbers=true').showLineNumbers).toBe(true)
  })
})

describe('parseEcInfo — combined realistic fence', () => {
  it('parses a full authored meta in one pass', () => {
    const mk = encodeMarkerToken
    const input = [
      'vue',
      'title="Demo"',
      mk('"x"'),
      mk('/foo/'),
      '{"note":3}',
      'collapse={1-2}',
      'showLineNumbers=false',
      'diff',
    ].join(' ')

    const parsed = parseEcInfo(input)
    expect(parsed.title).toBe('Demo')
    expect(parsed.diff).toBe(true)
    expect(parsed.showLineNumbers).toBe(false)
    expect(parsed.annotations).toEqual([{ text: 'note', lines: [3] }])
    expect(parsed.collapseRanges).toEqual([{ start: 1, end: 2 }])
    expect(parsed.highlights).toEqual([
      { pattern: 'x', lines: undefined, plain: true },
      { pattern: 'foo', lines: undefined, plain: undefined },
    ])
  })

  it('round-trips a fully encoded meta through a single parse (ranges preserved)', () => {
    const token = encodeAnnotationToken('a note', '4-8')
    const input = ['vue', encodeTitleToken('t'), token].join(' ')
    expect(parseEcInfo(input)).toMatchObject({
      title: 't',
      annotations: [{ text: 'a note', lines: [4, 5, 6, 7, 8] }],
    })
  })
})
