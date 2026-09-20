import type { HighlighterCore } from 'shiki/core'
import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine-javascript.mjs'
import amoxtliLight from '~/themes/amoxtli-light'

let _highlighter: Promise<HighlighterCore> | null = null

export async function useDiffHighlighter() {
  _highlighter ??= createHighlighterCore({
    themes: [
      import('shiki/themes/vesper.mjs'),
      amoxtliLight,
    ],
    langs: [
      import('shiki/langs/vue.mjs'),
      import('shiki/langs/typescript.mjs'),
      import('shiki/langs/javascript.mjs'),
      import('shiki/langs/css.mjs'),
      import('shiki/langs/scss.mjs'),
      import('shiki/langs/html.mjs'),
      import('shiki/langs/json.mjs'),
      import('shiki/langs/yaml.mjs'),
      import('shiki/langs/bash.mjs'),
    ],
    engine: createJavaScriptRegexEngine(),
  })
  return _highlighter
}

type DiffLang = 'vue' | 'svelte' | 'html' | 'ts' | 'tsx' | 'typescript'
  | 'js' | 'jsx' | 'javascript' | 'css' | 'scss' | 'json' | 'yaml' | 'yml'
  | 'sh' | 'bash' | 'shell' | 'txt' | 'plaintext'

const LANG_MAP: Record<DiffLang, string> = {
  vue: 'vue',
  svelte: 'html',
  html: 'html',
  ts: 'typescript',
  tsx: 'typescript',
  typescript: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  javascript: 'javascript',
  css: 'css',
  scss: 'scss',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  sh: 'bash',
  bash: 'bash',
  shell: 'bash',
  txt: 'text',
  plaintext: 'text',
}

/**
 * Map an author-facing fence language to a shiki lang id loaded in the diff
 * highlighter; unknown languages fall back to plain text.
 */
export function normalizeDiffLang(lang?: string): string {
  const key = (lang ?? '').trim().toLowerCase()
  return LANG_MAP[key as DiffLang] ?? 'text'
}
