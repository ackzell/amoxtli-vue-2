export interface Annotation {
  text: string
  lines: number[]
}

export interface CollapseRange {
  start: number
  end: number
}

export interface ParsedEcInfo {
  file: string
  title: string
  showLineNumbers: boolean
  collapseRanges: CollapseRange[]
  collapseLines: number[]
  annotations: Annotation[]
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
    for (let i = from; i <= to; i++)
      values.add(i)
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
    ranges.push({
      start: Math.min(start, end),
      end: Math.max(start, end),
    })
  }
  return ranges.sort((a, b) => a.start - b.start)
}

export function parseEcInfo(input: string): ParsedEcInfo {
  // Restore encoded annotations
  // they are encoded in a nuxt hook
  // so we can write them in a way that shiki won't mess with, then decode back here
  const restored = input.replace(
    /__EANN_([0-9a-f]+)_L_([\d_]+)__/g,
    (_, hex, lines) => {
      const text = (hex.match(/.{2}/g) ?? [])
        .map((b: string) => String.fromCharCode(Number.parseInt(b, 16)))
        .join('')
      return `{"${text}":${lines.replace(/_/g, ',')}}`
    },
  )

  const file = restored.match(/(?:^|\s)file:(\S+)/)?.[1] || ''
  const title = restored.match(/(?:^|\s)title="([^"]+)"/)?.[1] || ''
  const showLineNumbersRaw = restored.match(/(?:^|\s)showLineNumbers(?:=|\{)(true|false)\}?/i)?.[1]
  const showLineNumbers = showLineNumbersRaw
    ? showLineNumbersRaw.toLowerCase() !== 'false'
    : true
  const collapseRaw = restored.match(/(?:^|\s)collapse=\{([^}]+)\}/)?.[1] || ''
  const collapseRanges = collapseRaw ? parseCollapseRanges(collapseRaw) : []
  const collapseLines = collapseRaw ? parseRanges(collapseRaw) : []

  const annotations: Annotation[] = []
  const annotationRegex = /\{"([^"]+)":([0-9,\- ]+)\}/g
  let match: RegExpExecArray | null = annotationRegex.exec(restored)
  while (match) {
    const text = match[1]?.trim()
    const ranges = match[2]?.trim()
    if (text && ranges) {
      annotations.push({
        text,
        lines: parseRanges(ranges),
      })
    }
    match = annotationRegex.exec(restored)
  }

  return {
    file,
    title,
    showLineNumbers,
    collapseRanges,
    collapseLines,
    annotations,
  }
}
