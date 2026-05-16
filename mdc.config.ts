import { defineConfig } from '@nuxtjs/mdc/config'
import { parseEcInfo } from './composables/useEcParser'

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export default defineConfig({
  shiki: {
    setup() {
      console.log('[ec-highlight] setup called')
    },
    transformers: [
      {
        name: 'ec-highlight',
        preprocess(code, options) {
          const meta = (options.meta as any)?.__raw ?? ''
          const parsed = parseEcInfo(meta)

          console.log('[ec-highlight] meta:', meta)
          console.log('[ec-highlight] highlights:', JSON.stringify(parsed.highlights))

          if (!parsed.highlights.length)
            return

          options.decorations ??= []
          const lines = code.split('\n')

          for (const { pattern, lines: targetLines } of parsed.highlights) {
            const regex = new RegExp(escapeRegExp(pattern), 'g')
            lines.forEach((lineText, lineIndex) => {
              if (targetLines && !targetLines.includes(lineIndex + 1))
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
      },
    ],
  },
})
