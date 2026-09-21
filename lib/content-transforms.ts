import { Buffer } from 'node:buffer'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  encodeAnnotationToken,
  encodeCollapseToken,
  encodeLabelToken,
  encodeMarkerToken,
  encodeTitleToken,
} from './ec-tokens'

/**
 * Pure string transforms for lesson markdown, extracted from the
 * `content:file:beforeParse` hook in `nuxt.config.ts` so they can be pinned by
 * tests (see `lib/content-transforms.test.ts`).
 *
 * Each function takes a document body and returns a transformed body. They are
 * meant to be chained in the exact order the hook used to apply them:
 *
 *   normalizeVueDiffFences → inferLangFromFilePath → encodeAnnotations →
 *   encodeMarkers → encodeCollapse → inlineTemplateFiles → wrapLiveBlocks →
 *   autoInjectChallengeCheck
 */

// Normalize `{lang}-diff` fence languages to `{lang} diff`. Authors write
// ` ```vue-diff ` so ESLint's markdown processor pass-throughs the fence (an
// unknown language isn't parsed as a runnable SFC, and a `+`/`-` prefixed body
// would otherwise be a parse error). At build time we rewrite it to the
// canonical ` ```vue diff ` form so MDC/Shiki/indexing see a real `vue`
// language and the bare `diff` meta token.
export function normalizeVueDiffFences(body: string): string {
  return body.replace(
    /^(`{3,})([\w.-]+)-diff((?:[ \t][^\n]*)?)$/gm,
    (_match, fence: string, lang: string, rest: string) =>
      `${fence}${lang} diff${rest}`,
  )
}

const EXT_LANG_MAP: Record<string, string> = {
  vue: 'vue',
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  html: 'html',
  css: 'css',
  scss: 'scss',
  json: 'json',
  md: 'markdown',
  py: 'python',
  sh: 'bash',
  yaml: 'yaml',
  yml: 'yaml',
}

// Infer language from file extension when none is specified.
export function inferLangFromFilePath(body: string): string {
  return body.replace(
    /^(`{3,})([ \t]*(?:file|solution):\/(\S+))([ \t][^\n]*)?\n/gm,
    (_match, fence: string, filePrefix: string, filePath: string, rest: string) => {
      const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
      const lang = EXT_LANG_MAP[ext]
      if (!lang)
        return _match
      return `${fence}${lang} ${filePrefix}${rest ?? ''}\n`
    },
  )
}

// Encode `{"text":lines}` annotations and bare `{"text"}` labels as opaque hex
// tokens so Shiki/MDC never see quotes or braces in the fence meta.
export function encodeAnnotations(body: string): string {
  let out = body
  // Multiple {"text":lines} annotations can share an opening fence; the loop
  // runs until the line is token-free.
  const annotationRe = /^(`{3}[^\n]*)\{"([^"]+)":([0-9,\- ]+)\}/gm
  while (annotationRe.test(out)) {
    out = out.replace(
      annotationRe,
      (_match, before: string, text: string, lines: string) =>
        `${before}${encodeAnnotationToken(text, lines)}`,
    )
    annotationRe.lastIndex = 0
  }

  // Bare {"text"} annotations (no line numbers).
  return out.replace(
    /^(`{3}[^\n]*)\{"([^"]+)"\}(?=\s|$)/gm,
    (_match, before: string, text: string) => `${before}${encodeLabelToken(text)}`,
  )
}

// Encode text markers as opaque hex tokens so MDC never sees quotes, { }, [ ],
// /, or other special characters inside them:
//   - quoted markers `"plain text"` / `'plain text'` (plaintext match)
//   - slash markers `/regex/` (regular expression)
// `title="..."` is shielded first so quotes inside a title (e.g.
// title="called 'useGreeter'") can't be mistaken for markers. Quoted markers are
// encoded first so a slash inside a quoted string can't be mistaken for a regex
// marker. Require leading whitespace so we don't match quotes/slashes in
// `file:` paths.
export function encodeMarkers(body: string): string {
  return body.replace(
    /^(`{3}[^\n]*)$/gm,
    (fullLine) => {
      const titles: string[] = []
      const shielded = fullLine.replace(/title="((?:[^"\\]|\\.)*)"/g, (match) => {
        titles.push(match)
        return `__ECTITLE_${titles.length - 1}__`
      })

      const encoded = shielded
        .replace(
          /(?<=\s)"((?:[^"\\]|\\.)*)"(?=[\s\d,\-]|$)/g,
          match => encodeMarkerToken(match),
        )
        .replace(
          /(?<=\s)'((?:[^'\\]|\\.)*)'(?=[\s\d,\-]|$)/g,
          match => encodeMarkerToken(match),
        )
        .replace(
          /(?<=\s)\/([^/]+)\/(?=[\s\d,\-]|$)/g,
          match => encodeMarkerToken(match),
        )

      return encoded.replace(/__ECTITLE_(\d+)__/g, (_whole, i: string) => titles[Number(i)] ?? '')
    },
  )
}

// Escape collapse braces so MDC doesn't consume them as attribute syntax. Runs
// unconditionally: MDC's parseThematicBlock strips any {lines} token from the
// fence meta as a highlight range, so an unescaped collapse={...} would
// silently drop the collapse directive (the `collapse=` token stays in the meta
// but with no value the parser discards it).
export function encodeCollapse(body: string): string {
  return body.replace(
    /^(`{3}[^\n]*)collapse=\{([^}]+)\}/gm,
    (_match, before: string, val: string) => `${before}${encodeCollapseToken(val)}`,
  )
}

// Inline `file:/...` and `solution:/...` fences from the lesson's `.template`
// directory, honoring `extract={...}` ranges and encoding `title="..."` into a
// hex token (escaped `\"` / `\\` / `` \` `` quotes etc.).
export function inlineTemplateFiles(body: string, dirname: string): string {
  const templateDir = join(dirname, '.template', 'files')
  const solutionsDir = join(dirname, '.template', 'solutions')

  if (!existsSync(templateDir) && !existsSync(solutionsDir))
    return body

  let out = body.replace(
    /^(`{3,})(\w+)?[ \t]*(file|solution):\/(\S+)([ \t][^\n]*)?\n([\s\S]*?\n)?\1/gm,
    (match, fence: string, lang: string | undefined, prefix: string, filePath: string, rest: string) => {
      const baseDir = prefix === 'solution' ? solutionsDir : templateDir
      const fullPath = join(baseDir, filePath)
      if (!existsSync(fullPath))
        return match
      let content = readFileSync(fullPath, 'utf-8').trimEnd()

      const extractMatch = (rest || '').match(/extract=\{([^}]+)\}/)
      if (extractMatch) {
        const parts = extractMatch[1].replace(/\s+/g, '').split(',')
        const lines = content.split('\n')
        const extracted: string[] = []
        for (const part of parts) {
          const breakMatch = part.match(/^\[(\d+)\]$/)
          if (breakMatch) {
            const count = Number.parseInt(breakMatch[1]!, 10)
            for (let i = 0; i < count; i++)
              extracted.push('')
          }
          else {
            const [s, e] = part.split('-').map(Number)
            const end = e ?? s
            if (!Number.isNaN(s) && !Number.isNaN(end) && s > 0 && end >= s) {
              for (let i = s - 1; i < end && i < lines.length; i++) {
                if (lines[i] !== undefined)
                  extracted.push(lines[i]!)
              }
            }
          }
        }
        content = extracted.join('\n')
      }

      return `${fence}${lang ?? ''} ${prefix}:/${filePath}${rest ?? ''}\n${content}\n${fence}`
    },
  )

  // Encode title="..." (with escaped quotes) after inlining.
  out = out.replace(
    /^(`{3}\S*)\s+title="((?:[^"\\]|\\.)*)"/gm,
    (_match, prefix: string, titleValue: string) => {
      const decoded = titleValue.replace(/\\(["\\`])/g, '$1')
      return `${prefix} ${encodeTitleToken(decoded)}`
    },
  )

  return out
}

// Detect live code blocks and wrap them in the VueLive/HtmlLive component.
// Must run after file/solution inlining above so `file:/path` snippets with the
// `live` keyword work.
export function wrapLiveBlocks(body: string): string {
  return body.replace(
    /^(`{3,})([^\n`]*?\blive\b)([^\n]*)\n([\s\S]*?)\n\1/gm,
    (_match, _fence: string, before: string, after: string, code: string) => {
      const langMatch = before.match(/(\S+)/)
      const lang = langMatch ? langMatch[1]! : 'vue'
      const b64 = Buffer.from(`${code}\n`).toString('base64')
      let hide = ''
      const hideMatch = (`${before} ${after}`).match(/hide=\{([^}]+)\}/)
      if (hideMatch && hideMatch[1])
        hide = hideMatch[1].replace(/\s+/g, '')
      const hideAttr = hide ? ` hide="${hide}"` : ''

      let showLineNumbers = ''
      const slnMatch = (`${before} ${after}`).match(
        /showLineNumbers(?:=\s*(?:\{\s*)?(true|false)\s*\}?)?/,
      )
      if (slnMatch)
        showLineNumbers = slnMatch[1] ?? 'true'
      const slnAttr = showLineNumbers ? ` :showLineNumbers="${showLineNumbers}"` : ''

      let showConsole = ''
      const scMatch = (`${before} ${after}`).match(
        /showConsole(?:=\s*(?:\{\s*)?(true|false)\s*\}?)?/,
      )
      if (scMatch)
        showConsole = scMatch[1] ?? 'true'
      const scAttr = showConsole ? ` :showConsole="${showConsole}"` : ''

      let showPreview = ''
      const spMatch = (`${before} ${after}`).match(
        /showPreview(?:=\s*(?:\{\s*)?(true|false)\s*\}?)?/,
      )
      if (spMatch)
        showPreview = spMatch[1] ?? 'true'
      const spAttr = showPreview ? ` :showPreview="${showPreview}"` : ''

      const component = lang === 'html' ? 'html-live' : 'vue-live'

      return `:${component}{code="${b64}" lang="${lang}"${hideAttr}${slnAttr}${scAttr}${spAttr}}`
    },
  )
}

// Auto-place the "Check my work" challenge widget at the end of the lesson when
// the lesson's `.template/index.ts` defines a validation suite. A manual
// `::challenge-check` placement in the body wins and suppresses injection.
export function autoInjectChallengeCheck(body: string, dirname: string): string {
  const templateDir = join(dirname, '.template', 'files')
  const hasManualCheck = /^::challenge-check/m.test(body)
  if (!hasManualCheck && existsSync(templateDir)) {
    const indexTsPath = join(dirname, '.template', 'index.ts')
    if (existsSync(indexTsPath)) {
      const src = readFileSync(indexTsPath, 'utf-8')
      const hasValidationSuite = /\bvalidation\s*:\s*\{/.test(src)
      if (hasValidationSuite)
        return `${body.trimEnd()}\n\n::challenge-check\n`
    }
  }
  return body
}
