/*
 * Shared codec for the opaque hex tokens that shield fence metadata from
 * MDC/Shiki during content parsing.
 *
 * - Build-time encoding happens in `lib/content-transforms.ts` (called from the
 *   `content:file:beforeParse` hook in `nuxt.config.ts`).
 * - Runtime decoding happens in `composables/useEcParser.ts` (`parseEcInfo`).
 *
 * Both sides must agree on the token format. Keeping the encode/decode pair in
 * a single module prevents the two from drifting: a token re-encoded on one
 * side but not decodable on the other would silently corrupt every fenced block
 * meta in the lessons.
 *
 * This module must stay dependency-free (no `node:*` imports): the decoders run
 * in the browser via `useEcParser`, and the encoders run inside @nuxt/content's
 * parser via `mdc.config.ts`, where neither `~/` aliases nor Node-only builtins
 * are guaranteed.
 */

const utf8Encoder = new TextEncoder()

function bytesToHex(bytes: Uint8Array): string {
  let hex = ''
  for (const byte of bytes)
    hex += byte.toString(16).padStart(2, '0')
  return hex
}

export function encodeHex(value: string): string {
  return bytesToHex(utf8Encoder.encode(value))
}

/**
 * Byte-wise hex decode (one byte → one code unit). Matches the annotation /
 * label / marker token semantics. NOT UTF-8 safe for multi-byte code points.
 */
export function decodeHex(hex: string): string {
  return (hex.match(/.{2}/g) ?? [])
    .map(byte => String.fromCharCode(Number.parseInt(byte, 16)))
    .join('')
}

/**
 * UTF-8-safe hex decode. Only the `title=__ETIT_...__` token uses this; it is
 * the only token that round-trips multi-byte titles correctly.
 */
export function decodeUtf8Hex(hex: string): string {
  return decodeURIComponent(hex.replace(/([a-f0-9]{2})/gi, '%$1'))
}

// ─── Token builders (encode side) ──────────────────────────────────────────

export function encodeLabelToken(text: string): string {
  return `__ELBL_${encodeHex(text)}__`
}

export function encodeAnnotationToken(text: string, lines: string): string {
  return `__EANN_${encodeHex(text)}_L_${encodeHex(lines.trim())}__`
}

export function encodeMarkerToken(text: string): string {
  return `__ECPT_${encodeHex(text)}__`
}

export function encodeTitleToken(title: string): string {
  return `title=__ETIT_${encodeHex(title)}__`
}

export function encodeCollapseToken(value: string): string {
  return `collapse=__ECOL_${value}__`
}

// ─── Token decoders (decode side) ──────────────────────────────────────────

export interface DecodedAnnotation {
  text: string
  /** Comma-separated range string, e.g. `3-5,8` (ready for parseRanges). */
  lines: string
}

export function decodeLabelTokens(input: string): { value: string, labels: string[] } {
  const labels: string[] = []
  const value = input.replace(/__ELBL_([0-9a-f]+)__/g, (_whole, hex: string) => {
    labels.push(decodeHex(hex))
    return ''
  })
  return { value, labels }
}

export function decodeAnnotationTokens(
  input: string,
): { value: string, annotations: DecodedAnnotation[] } {
  const annotations: DecodedAnnotation[] = []
  const value = input.replace(
    /__EANN_([0-9a-f]+)_L_([0-9a-f]+)__/g,
    (_whole, hex: string, linesHex: string) => {
      annotations.push({ text: decodeHex(hex), lines: decodeHex(linesHex) })
      return ''
    },
  )
  return { value, annotations }
}

/**
 * Replaces marker tokens with their decoded raw text, which downstream regex
 * parsing (quoted/substring and /pattern/ highlight markers) then consumes.
 */
export function decodeMarkerTokens(input: string): string {
  return input.replace(/__ECPT_([0-9a-f]+)__/g, (_whole, hex: string) => decodeHex(hex))
}

export function decodeTitleToken(input: string): { value: string, title?: string } {
  let title: string | undefined
  const value = input.replace(
    /(?:^|\s)title=__ETIT_([A-Fa-f0-9]+)__/,
    (_whole, hex: string) => {
      title = decodeUtf8Hex(hex)
      return ''
    },
  )
  return { value, title }
}

export function decodeCollapseToken(input: string): { value: string, ranges?: string } {
  let ranges: string | undefined
  const value = input.replace(
    /(?:^|\s)collapse=(?:\{([^}]+)\}|__ECOL_([^_]+)__)/,
    (_whole, raw: string | undefined, encoded: string | undefined) => {
      ranges = raw ?? encoded
      return ''
    },
  )
  return { value, ranges }
}
