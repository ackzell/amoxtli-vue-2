export interface ChangelogCommit {
  short: string
  url: string
}

export interface ChangelogItem {
  text: string
  scope?: string
  commits: ChangelogCommit[]
}

export interface ChangelogSection {
  heading: string
  items: ChangelogItem[]
}

export interface ChangelogRelease {
  version: string
  date?: string
  compareUrl?: string
  sections: ChangelogSection[]
}

const HEADER_RE = /^## (?:\[([^\]]+)\]\(([^)]+)\)|([\d.]+))\s*(?:\((\d{4}-\d{2}-\d{2})\))?$/
const SECTION_RE = /^### (.+)$/
const BULLET_RE = /^\* (.+)$/
const COMMIT_RE = /\(\s*\[([a-f0-9]{7,40})\]\(([^)]+)\)\s*\)/gi
const SCOPE_RE = /^\*\*([^*:]+):?\*\*\s*/
const CLOSES_RE = /(?:,\s*)?(?:closes?|fixe?s?|see)\s+(?:#\d+|\[#\d+\]\([^)]+\))/gi

export function parseChangelog(raw: string): ChangelogRelease[] {
  const lines = raw.split('\n')
  const releases: ChangelogRelease[] = []
  let current: ChangelogRelease | null = null
  let currentSection: ChangelogSection | null = null

  for (const line of lines) {
    const trimmed = line.trimEnd()

    const headerMatch = trimmed.match(HEADER_RE)
    if (headerMatch) {
      if (current?.sections.length)
        releases.push(current)
      const [, bracketVersion, bracketUrl, bareVersion, date] = headerMatch
      current = {
        version: (bracketVersion ?? bareVersion)!,
        date: date || undefined,
        compareUrl: bracketUrl || undefined,
        sections: [],
      }
      currentSection = null
      continue
    }

    if (!current)
      continue

    const sectionMatch = trimmed.match(SECTION_RE)
    if (sectionMatch) {
      currentSection = { heading: sectionMatch[1]!, items: [] }
      current.sections.push(currentSection)
      continue
    }

    const bulletMatch = trimmed.match(BULLET_RE)
    if (bulletMatch && currentSection)
      currentSection.items.push(parseItem(bulletMatch[1]!))
  }

  if (current?.sections.length)
    releases.push(current)

  return releases.filter(r => r.sections.some(s => s.items.length))
}

function parseItem(raw: string): ChangelogItem {
  const scopeMatch = raw.match(SCOPE_RE)
  const scope = scopeMatch?.[1]

  const commits: ChangelogCommit[] = []
  for (const match of raw.matchAll(COMMIT_RE)) {
    commits.push({ short: match[1]!, url: match[2]! })
  }

  const text = raw
    .replace(SCOPE_RE, '')
    .replace(COMMIT_RE, '')
    .replace(CLOSES_RE, '')
    .replace(/\[#\d+\]\([^)]+\)/g, '')
    .trim()
    .replace(/[,\s]+$/, '')
    .trim()

  return { text, scope, commits }
}
