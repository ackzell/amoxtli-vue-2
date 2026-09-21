import {
  decodeAnnotationTokens,
  decodeCollapseToken,
  decodeLabelTokens,
  decodeMarkerTokens,
  decodeTitleToken,
} from '../lib/ec-tokens'

export interface Annotation {
  text: string
  lines: number[]
}

export interface CollapseRange {
  start: number
  end: number
}

export interface Highlight {
  pattern: string
  lines?: number[]
  // When true, `pattern` is a plaintext substring (quoted marker), not a regex
  plain?: boolean
}

export interface ParsedEcInfo {
  file: string
  title: string
  showLineNumbers: boolean
  collapseRanges: CollapseRange[]
  collapseLines: number[]
  annotations: Annotation[]
  highlights: Highlight[]
  labels: string[]
  // When true, the block is rendered as an inline diff: lines prefixed with
  // `+` / `-` become inserted / deleted (see useEcDecorations + ProsePre.vue).
  diff: boolean
}

export function parseRanges(input: string): number[] {
  const values = new Set<number>()
  for (const part of input.split(',').map(i => i.trim()).filter(Boolean)) {
    const [startRaw, endRaw] = part.split('-').map(i => i.trim())
    const start = Number(startRaw)
    const end = endRaw ? Number(endRaw) : start
    if (!Number.isFinite(start) || !Number.isFinite(end))
      continue
    const from = Math.min(start, end)
    const to = Math.max(start, end)
    for (let i = from; i <= to; i++) values.add(i)
  }
  return [...values]
}

export function parseCollapseRanges(input: string): CollapseRange[] {
  const ranges: CollapseRange[] = []
  for (const part of input.split(',').map(i => i.trim()).filter(Boolean)) {
    const [startRaw, endRaw] = part.split('-').map(i => i.trim())
    const start = Number(startRaw)
    const end = endRaw ? Number(endRaw) : start
    if (!Number.isFinite(start) || !Number.isFinite(end))
      continue
    ranges.push({ start: Math.min(start, end), end: Math.max(start, end) })
  }
  return ranges.sort((a, b) => a.start - b.start)
}

export function parseEcInfo(input: string = ''): ParsedEcInfo {
  const result: ParsedEcInfo = {
    file: '',
    title: '',
    showLineNumbers: true,
    collapseRanges: [],
    collapseLines: [],
    annotations: [],
    highlights: [],
    labels: [],
    diff: false,
  }

  if (!input)
    return result

  // console.group('--- [EC PARSER DEBUG] ---')
  // console.log('Raw input:', input)

  let workingString = input

  // Decode bare {"text"} labels (no line numbers) and strip them.
  // The text is stored in result.labels for potential future use.
  {
    const { value, labels } = decodeLabelTokens(workingString)
    workingString = value
    result.labels.push(...labels)
  }

  const { value: annotatedValue, annotations: decodedAnnotations } = decodeAnnotationTokens(workingString)
  workingString = annotatedValue
  for (const { text, lines } of decodedAnnotations)
    result.annotations.push({ text, lines: parseRanges(lines) })

  // Fallback: parse raw {"text":lines} annotations (when beforeParse encoding didn't run)
  const rawAnnotationRe = /\{"([^"]+)":([0-9,\- ]+)\}/g
  let rawMatch: RegExpExecArray | null
  while ((rawMatch = rawAnnotationRe.exec(workingString)) !== null) {
    const text = rawMatch[1]
    const rangesStr = rawMatch[2]
    if (text && rangesStr)
      result.annotations.push({ text, lines: parseRanges(rangesStr) })
  }

  workingString = workingString.replace(/(?:^|\s)(?:file|solution):(\S+)/, (_, val) => { result.file = val; return '' })

  // Inline diff flag: authored as ` ```vue-diff ` (normalized to ` ```vue diff `
  // by the beforeParse hook), or directly as ` ```vue diff `. The bare `diff`
  // word survives MDC meta untouched (like `twoslash`), so strip it here.
  workingString = workingString.replace(/(?:^|\s)diff(?=\s|$)/, () => {
    result.diff = true
    return ''
  })

  // Decode title=__ETIT_<hex>__ (escaped quotes encoded by beforeParse hook)
  {
    const { value, title } = decodeTitleToken(workingString)
    workingString = value
    if (title !== undefined)
      result.title = title
  }

  // Plain title="..." (no escaped quotes, no encoding needed)
  workingString = workingString.replace(/(?:^|\s)title="([^"]+)"/, (_, val) => { result.title = val; return '' })
  // workingString = workingString.replace(/(?:^|\s)collapse=\{([^}]+)\}/, (_, val) => {
  //   result.collapseRanges = parseCollapseRanges(val); return ''
  // })

  // Was: collapse=\{([^}]+)\}
  // Now handles both encoded and raw forms
  {
    const { value, ranges } = decodeCollapseToken(workingString)
    workingString = value
    if (ranges !== undefined)
      result.collapseRanges = parseCollapseRanges(ranges)
  }

  workingString = workingString.replace(
    /(?:^|\s)showLineNumbers=(true|false)/,
    (_, val) => { result.showLineNumbers = val !== 'false'; return '' },
  )

  // Decode whole /pattern/ and "plain text" markers from hex encoding
  workingString = decodeMarkerTokens(workingString)

  // Extract quoted plaintext markers ("text" / 'text'). These are literal
  // substring matches (Expressive Code semantics), not regular expressions.
  // Removed from the string so the slash parser below can't see their content.
  // An optional trailing line range (`"text" 5-8`) restricts the match.
  const plainMarkerRegex = /(?:^|\s)(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')(?:[ \t]+([0-9,\-]+))?(?=\s|$)/g
  workingString = workingString.replace(plainMarkerRegex, (_, dq, sq, rawLines) => {
    const text = (dq ?? sq ?? '').replace(/\\(["'\\])/g, '$1')
    if (text) {
      const lines = (rawLines && rawLines.length > 0)
        ? parseRanges(rawLines)
        : undefined
      result.highlights.push({ pattern: text, lines, plain: true })
    }
    return ' '
  })

  const highlightRegex = /\/([^/]+)\/(?:[ \t]+([0-9,\-]+))?(?=[\s\d,\-]|$)/g
  let hMatch: RegExpExecArray | null

  hMatch = highlightRegex.exec(workingString)

  while (hMatch !== null) {
    if (hMatch[1]) {
      const pattern = hMatch[1].trim()
      const rawLines = hMatch[2]?.trim()

      // FIX: Only parse if rawLines actually has content,
      // otherwise keep it undefined so it matches all lines.
      const lines = (rawLines && rawLines.length > 0)
        ? parseRanges(rawLines)
        : undefined

      // console.log(`Found highlight: "${pattern}" on lines:`, lines || 'all')
      result.highlights.push({ pattern, lines })
    }
    hMatch = highlightRegex.exec(workingString)
  }

  // console.log('Final highlights array:', JSON.stringify(result.highlights))
  // console.groupEnd()

  return result
}
