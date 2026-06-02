import { createHighlighterCore } from '@shikijs/core'
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript'
import amoxtliLight from '~/themes/amoxtli-light'

let _highlighter: Awaited<ReturnType<typeof createHighlighterCore>> | null = null

export async function useMagicMoveHighlighter() {
  if (!_highlighter) {
    _highlighter = await createHighlighterCore({
      themes: [
        import('shiki/themes/vesper.mjs'),
        amoxtliLight,
      ],
      langs: [
        import('shiki/langs/typescript.mjs'),
        import('shiki/langs/vue.mjs'),
        import('shiki/langs/shellscript.mjs'),
        import('shiki/langs/json.mjs'),
        import('shiki/langs/scss.mjs'),
        import('shiki/langs/pug.mjs'),
      ],
      engine: createJavaScriptRegexEngine(),
    })
  }
  return _highlighter
}
