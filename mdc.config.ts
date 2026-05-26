import { defineConfig } from '@nuxtjs/mdc/config'
import { createTransformerFactory } from '@shikijs/twoslash/core'
import { createTwoslasher } from 'twoslash-vue'
import langPug from 'shiki/langs/pug.mjs'
import langScss from 'shiki/langs/scss.mjs'
import { parseEcInfo } from './composables/useEcParser'
import { rendererAmoxtli } from './shiki/renderer'

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export default defineConfig({
  shiki: {
    async setup(shiki) {
      await shiki.loadLanguage(langScss)
      await shiki.loadLanguage(langPug)
    },
    transformers: [

      createTransformerFactory(
        createTwoslasher({}),
        rendererAmoxtli({}),
      )({
        // Only process blocks that explicitly have "twoslash" in the meta
        explicitTrigger: true,
        // Include vue for Vue SFC twoslash support via twoslash-vue
        langs: ['ts', 'tsx', 'vue'],
      }),

      {
        name: 'ec-highlight',
        preprocess(code, options) {
          const meta = typeof options.meta === 'string'
            ? options.meta
            : (options.meta as any)?.__raw ?? ''
          const parsed = parseEcInfo(meta)

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
