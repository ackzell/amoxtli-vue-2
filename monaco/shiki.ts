import type { HighlighterCore } from 'shiki/core'
import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine-javascript.mjs'
import langPug from 'shiki/langs/pug.mjs'
import langScss from 'shiki/langs/scss.mjs'
import langVue from 'shiki/langs/vue.mjs'
import themeDark from 'shiki/themes/vesper.mjs'
import customLightTheme from '~/themes/amoxtli-light'

let highlighter: Promise<HighlighterCore> | undefined

export async function getShiki() {
  if (highlighter)
    return highlighter

  const darkColors = (themeDark as any).colors as Record<string, string>
  darkColors['editor.background'] = '#0b0c07'
  darkColors.focusBorder = '#0b0c07'
  darkColors['editorCursor.foreground'] = '#ffc799'
  darkColors['editorStickyScroll.background'] = '#0b0c07'
  darkColors['editorStickyScroll.shadow'] = '#ffc79933'

  highlighter = createHighlighterCore({
    langs: [
      langVue as any,
      langScss as any,
      langPug as any,
    ],
    themes: [
      customLightTheme as any,
      themeDark as any,
    ],
    engine: createJavaScriptRegexEngine(),
  })

  return highlighter
}
