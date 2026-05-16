import type { ShikiTransformer } from 'shiki'

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function transformerEcHighlight(): ShikiTransformer {
  return {
    name: 'ec-highlight',
    preprocess(code, options) {
      // TODO: remove after verifying
      console.log('[ec-highlight] meta:', options.meta)

      const meta = options.meta ?? ''
      const parsed = parseEcInfo(meta)

      if (!parsed.highlights.length)
        return

      const lines = code.split('\n')
      options.decorations ??= []

      for (const { pattern, lines: targetLines } of parsed.highlights) {
        const regex = new RegExp(escapeRegExp(pattern), 'g')

        lines.forEach((lineText, lineIndex) => {
          const lineNumber = lineIndex + 1 // parseEcInfo uses 1-based
          if (targetLines && !targetLines.includes(lineNumber))
            return

          for (const match of lineText.matchAll(regex)) {
            options.decorations!.push({
              start: { line: lineIndex, character: match.index! },
              end: { line: lineIndex, character: match.index! + match[0].length },
              properties: { class: 'ec-highlight' },
            })
          }
        })
      }
    },
  }
}
