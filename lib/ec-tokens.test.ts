import { describe, expect, it } from 'vitest'

import {
  decodeAnnotationTokens,
  decodeCollapseToken,
  decodeHex,
  decodeLabelTokens,
  decodeMarkerTokens,
  decodeTitleToken,
  decodeUtf8Hex,
  encodeAnnotationToken,
  encodeCollapseToken,
  encodeHex,
  encodeLabelToken,
  encodeMarkerToken,
  encodeTitleToken,
} from './ec-tokens'

describe('ec-tokens — hex codec', () => {
  it('round-trips ASCII through encodeHex/decodeHex', () => {
    expect(decodeHex(encodeHex('const x = 1'))).toBe('const x = 1')
  })

  it('decodeHex is byte-wise (latin-1), not UTF-8', () => {
    // "é" is c3 a9 in UTF-8; a byte-wise decode yields two code units.
    expect(decodeHex('c3a9')).toBe('Ã©')
  })

  it('decodeUtf8Hex recovers multi-byte text', () => {
    expect(decodeUtf8Hex(encodeHex('café'))).toBe('café')
    expect(decodeUtf8Hex(encodeHex('sí, México'))).toBe('sí, México')
  })
})

describe('ec-tokens — token round trips', () => {
  it('label tokens decode to bare text and are stripped', () => {
    const input = `${encodeLabelToken('hello')} ${encodeLabelToken('mundo')}`
    expect(decodeLabelTokens(input)).toEqual({ value: ' ', labels: ['hello', 'mundo'] })
  })

  it('annotation tokens round-trip authored range strings verbatim', () => {
    const input = `${encodeAnnotationToken('note A', '1-3,5')} ${encodeAnnotationToken('note B', '4')}`
    const { value, annotations } = decodeAnnotationTokens(input)
    expect(value).toBe(' ')
    expect(annotations).toEqual([
      { text: 'note A', lines: '1-3,5' },
      { text: 'note B', lines: '4' },
    ])
  })

  it('annotation token line ranges are hex-encoded, preserving hyphens and commas', () => {
    expect(encodeAnnotationToken('x', '4-8')).toBe(`__EANN_${encodeHex('x')}_L_${encodeHex('4-8')}__`)
    expect(encodeAnnotationToken('x', ' 23 ')).toBe(`__EANN_${encodeHex('x')}_L_${encodeHex('23')}__`)
  })

  it('marker tokens decode back to their raw marker text', () => {
    const input = `${encodeMarkerToken('"plain text"')} ${encodeMarkerToken('/re/g')}`
    expect(decodeMarkerTokens(input)).toBe('"plain text" /re/g')
  })

  it('title tokens decode via UTF-8', () => {
    const input = `prefix ${encodeTitleToken('café')}`
    expect(decodeTitleToken(input)).toEqual({ value: 'prefix', title: 'café' })
  })

  it('collapse tokens decode their inner range string', () => {
    const input = `x ${encodeCollapseToken('4-7,10')}`
    expect(decodeCollapseToken(input)).toEqual({ value: 'x', ranges: '4-7,10' })
  })
})

describe('ec-tokens — pinned token formats', () => {
  it('locks the exact encoding used at build time', () => {
    expect(encodeLabelToken('hi')).toBe('__ELBL_6869__')
    expect(encodeAnnotationToken('ok', '1-2')).toBe(`__EANN_6f6b_L_${encodeHex('1-2')}__`)
    expect(encodeMarkerToken('"x"')).toBe('__ECPT_227822__')
    expect(encodeTitleToken('t')).toBe('title=__ETIT_74__')
    expect(encodeCollapseToken('1-2')).toBe('collapse=__ECOL_1-2__')
  })
})

describe('ec-tokens — no-op on plain input', () => {
  const plain = 'vue twoslash title="App.vue" {"raw":3}'
  const plainTitle = `prefix ${plain}`

  it('label decode returns input unchanged with no labels', () => {
    expect(decodeLabelTokens(plainTitle)).toEqual({ value: plainTitle, labels: [] })
  })

  it('annotation decode returns input unchanged with no annotations', () => {
    expect(decodeAnnotationTokens(plainTitle)).toEqual({ value: plainTitle, annotations: [] })
  })

  it('marker decode leaves non-token input untouched', () => {
    expect(decodeMarkerTokens(plainTitle)).toBe(plainTitle)
  })

  it('title decode reports undefined when no token present', () => {
    expect(decodeTitleToken(plainTitle)).toEqual({ value: plainTitle, title: undefined })
  })

  it('collapse decode reports undefined when no token present', () => {
    expect(decodeCollapseToken(plainTitle)).toEqual({ value: plainTitle, ranges: undefined })
  })
})
