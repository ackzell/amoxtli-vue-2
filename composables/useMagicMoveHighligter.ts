import { createHighlighter } from 'shiki'
import amoxtliLight from '~/themes/amoxtli-light'

let _highlighter: Awaited<ReturnType<typeof createHighlighter>> | null = null

export async function useMagicMoveHighlighter() {
  if (!_highlighter) {
    _highlighter = await createHighlighter({
      themes: [amoxtliLight, 'vesper'],
      langs: ['typescript', 'vue', 'bash', 'json', 'scss', 'pug'], // match your nuxt.config langs
    })
  }
  return _highlighter
}
