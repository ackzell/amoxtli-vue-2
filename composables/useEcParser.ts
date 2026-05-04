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
  const file = input.match(/(?:^|\s)file:(\S+)/)?.[1] || ''
  const title = input.match(/(?:^|\s)title="([^"]+)"/)?.[1] || ''
  const collapseRaw = input.match(/(?:^|\s)collapse=\{([^}]+)\}/)?.[1] || ''
  const collapseRanges = collapseRaw ? parseCollapseRanges(collapseRaw) : []
  const collapseLines = collapseRaw ? parseRanges(collapseRaw) : []

  const annotations: Annotation[] = []
  const annotationRegex = /\{"([^"]+)":([0-9,\- ]+)\}/g
  let match: RegExpExecArray | null = annotationRegex.exec(input)
  while (match) {
    const text = match[1]?.trim()
    const ranges = match[2]?.trim()
    if (text && ranges) {
      annotations.push({
        text,
        lines: parseRanges(ranges),
      })
    }
    match = annotationRegex.exec(input)
  }

  return {
    file,
    title,
    collapseRanges,
    collapseLines,
    annotations,
  }
}
