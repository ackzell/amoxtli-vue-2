import { defineConfig } from '@nuxtjs/mdc/config'
import { createTransformerFactory } from '@shikijs/twoslash/core'
import langPug from 'shiki/langs/pug.mjs'
import langScss from 'shiki/langs/scss.mjs'
import { createTwoslasher } from 'twoslash-vue'
import { parseEcInfo } from './composables/useEcParser'
import { rendererAmoxtli } from './shiki/renderer'

export default defineConfig({
  shiki: {
    async setup(shiki) {
      await shiki.loadLanguage(langScss)
      await shiki.loadLanguage(langPug)
    },
    transformers: [

      // Must run before the twoslash transformer: override this.codeToHast so
      // that highlightPopupContent inside rendererRich uses "typescript" lang
      // for popup type text instead of "vue" (which doesn't tokenize TS syntax).
      {
        name: 'ec-fix-popup-code-lang',
        preprocess() {
          const original = this.codeToHast.bind(this)
          this.codeToHast = (code: string, opts: any) => {
            const lang = opts?.lang
            if (lang === 'vue')
              opts = { ...opts, lang: 'typescript' }
            return original(code, opts)
          }
        },
      },

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
            let regex: RegExp
            try {
              regex = new RegExp(pattern, 'g')
            }
            catch {
              continue
            }
            lines.forEach((lineText, lineIndex) => {
              if (targetLines && !targetLines.includes(lineIndex + 1))
                return
              for (const match of lineText.matchAll(regex)) {
                const matchEnd = match.index! + match[0].length
                // The mdc:newline transformer appends \n to the last child
                // of each line element. applyLineSection accumulates text
                // via stringify which includes that \n, so we adjust the end
                // character by +1 when the match runs to the end of the line.
                const endCh = matchEnd === lineText.length
                  ? matchEnd + 1
                  : matchEnd
                options.decorations!.push({
                  start: { line: lineIndex, character: match.index! },
                  end: { line: lineIndex, character: endCh },
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
