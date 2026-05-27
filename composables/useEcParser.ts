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
  }

  if (!input)
    return result

  // console.group('--- [EC PARSER DEBUG] ---')
  // console.log('Raw input:', input)

  let workingString = input

  // Decode bare {"text"} labels (no line numbers) and strip them.
  // The text is stored in result.labels for potential future use.
  workingString = workingString.replace(/__ELBL_([0-9a-f]+)__/g, (_, hex) => {
    const text = (hex.match(/.{2}/g) ?? []).map((b: string) => String.fromCharCode(Number.parseInt(b, 16))).join('')
    result.labels.push(text)
    return ''
  })

  workingString = workingString.replace(/__EANN_([0-9a-f]+)_L_([\d_]+)__/g, (_, hex, lines) => {
    const text = (hex.match(/.{2}/g) ?? []).map((b: string) => String.fromCharCode(Number.parseInt(b, 16))).join('')
    result.annotations.push({ text, lines: parseRanges(lines.replace(/_/g, ',')) })
    return ''
  })

  // Fallback: parse raw {"text":lines} annotations (when beforeParse encoding didn't run)
  const rawAnnotationRe = /\{"([^"]+)":([0-9,\- ]+)\}/g
  let rawMatch: RegExpExecArray | null
  while ((rawMatch = rawAnnotationRe.exec(workingString)) !== null) {
    const text = rawMatch[1]
    const rangesStr = rawMatch[2]
    if (text && rangesStr)
      result.annotations.push({ text, lines: parseRanges(rangesStr) })
  }

  workingString = workingString.replace(/(?:^|\s)file:(\S+)/, (_, val) => { result.file = val; return '' })
  workingString = workingString.replace(/(?:^|\s)title="([^"]+)"/, (_, val) => { result.title = val; return '' })
  // workingString = workingString.replace(/(?:^|\s)collapse=\{([^}]+)\}/, (_, val) => {
  //   result.collapseRanges = parseCollapseRanges(val); return ''
  // })

  // Was: collapse=\{([^}]+)\}
  // Now handles both encoded and raw forms
  workingString = workingString.replace(
    /(?:^|\s)collapse=(?:\{([^}]+)\}|__ECOL_([^_]+)__)/,
    (_, v1, v2) => {
      result.collapseRanges = parseCollapseRanges(v1 ?? v2)
      return ''
    },
  )

  workingString = workingString.replace(
    /(?:^|\s)showLineNumbers=(true|false)/,
    (_, val) => { result.showLineNumbers = val !== 'false'; return '' },
  )

  const highlightRegex = /\/(.+?)\/(?=[\s\d,\-]|$)/g
  let hMatch: RegExpExecArray | null

  hMatch = highlightRegex.exec(workingString)

  while (hMatch !== null) {
    if (hMatch[1]) {
      let pattern = hMatch[1].trim()
      pattern = pattern.replace(/__ECLB__/g, '{').replace(/__ECRB__/g, '}')
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
