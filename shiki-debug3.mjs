import { createHighlighterCore, createPositionConverter } from '@shikijs/core'
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript'
import { transformerNotationDiff, transformerNotationErrorLevel, transformerNotationFocus, transformerNotationHighlight } from '@shikijs/transformers'
import langVue from 'shiki/langs/vue.mjs'
import themeMinLight from 'shiki/themes/min-light.mjs'

const shiki = await createHighlighterCore({
  langs: [langVue],
  themes: [themeMinLight],
  engine: createJavaScriptRegexEngine(),
})

// Clone mdc:newline transformer
function mdcNewline() {
  return {
    name: 'mdc:newline',
    line(node) {
      const last = node.children.at(-1)
      if (last?.type === 'element' && last.tagName === 'span') {
        const text = last.children.at(-1)
        if (text?.type === 'text')
          text.value += '\n'
      }
    },
  }
}

const code = '<h1>\n{{ message }}\n</h1>'
const metaRaw = '/{{/ /}}/'

const decorations = []
const lines = code.split('\n')
const parsedHighlights = [
  { pattern: '{{', lines: undefined },
  { pattern: '}}', lines: undefined },
]

for (const { pattern, lines: targetLines } of parsedHighlights) {
  const regex = new RegExp(pattern, 'g')
  lines.forEach((lineText, lineIndex) => {
    if (targetLines && !targetLines.includes(lineIndex + 1))
      return
    for (const match of lineText.matchAll(regex)) {
      const matchEnd = match.index + match[0].length
      const endCh = matchEnd === lineText.length ? matchEnd + 1 : matchEnd
      decorations.push({
        start: { line: lineIndex, character: match.index },
        end: { line: lineIndex, character: endCh },
        properties: { class: 'ec-highlight' },
      })
    }
  })
}

console.log('Decorations:', JSON.stringify(decorations))
console.log('')

// Let's also check what normalizePosition does
const converter = createPositionConverter(code)
console.log('Converter lines:', converter.lines.map((l, i) => `  [${i}] ${JSON.stringify(l)} (len ${l.length})`))

for (const d of decorations) {
  const lineText = converter.lines[d.start.line]
  console.log(`\nDecoration ${JSON.stringify(d)}:`)
  console.log(`  Line text: ${JSON.stringify(lineText)} (len ${lineText.length})`)
  console.log(`  start.character=${d.start.character}, end.character=${d.end.character}`)
  console.log(`  start <= lineLen: ${d.start.character <= lineText.length}`)
  console.log(`  end <= lineLen: ${d.end.character <= lineText.length}`)
}

// Check tokenization directly
const tokenResult = shiki.codeToTokensBase(code, { lang: 'vue', theme: 'min-light' })
console.log('\nTokens:')
for (let i = 0; i < tokenResult.length; i++) {
  console.log(`  Line ${i}:`)
  for (const t of tokenResult[i]) {
    console.log(`    [offset:${t.offset}] ${JSON.stringify(t.content)} (len ${t.content.length})`)
  }
}

// Now try the full rendering with the decorations
console.log('\n=== Full rendering ===')
try {
  const html = shiki.codeToHtml(code, {
    lang: 'vue',
    theme: 'min-light',
    defaultColor: false,
    meta: { __raw: metaRaw },
    decorations,
    transformers: [
      transformerNotationDiff(),
      transformerNotationErrorLevel(),
      transformerNotationFocus(),
      transformerNotationHighlight(),
      mdcNewline(),
    ],
  })
  console.log('OK')
  console.log(html)
}
catch (e) {
  console.log('ERROR:', e.message)
}
