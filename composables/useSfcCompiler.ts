import { parse, compileScript, compileTemplate, compileStyle } from '@vue/compiler-sfc'

function rewriteVueImports(code: string): string {
  return code.replace(
    /import\s+\{([^}]+)\}\s+from\s+['"](?:vue|@vue\/[^'"]*)['"]/g,
    (_, imports: string) =>
      imports
        .split(',')
        .map((i: string) => {
          const parts = i.trim().split(/\s+as\s+/)
          const sourceName = parts[0]?.trim() ?? ''
          const localName = (parts[1] ?? parts[0] ?? '').trim()
          return `const ${localName} = Vue.${sourceName}`
        })
        .join('\n'),
  )
}

export function useSfcCompiler() {
  function compileSfc(source: string): { js: string; css: string; error?: string } {
    try {
      const id = `vl:${Math.random().toString(36).slice(2, 10)}`

      const { descriptor, errors } = parse(source, { filename: 'App.vue' })
      if (errors.length) {
        return { js: '', css: '', error: errors[0]?.message ?? 'Parse error' }
      }

      let scriptCode = ''
      if (descriptor.script || descriptor.scriptSetup) {
        const result = compileScript(descriptor, { id })
        scriptCode = result.content
      }

      let renderCode = ''
      if (descriptor.template) {
        const result = compileTemplate({
          source: descriptor.template.content,
          id,
          filename: 'App.vue',
          scoped: descriptor.styles.some(s => s.scoped),
        })
        renderCode = result.code
      }

      const cssParts = descriptor.styles.map((s) => {
        const res = compileStyle({
          source: s.content,
          id,
          scoped: s.scoped,
          filename: 'App.vue',
        })
        return res.code
      })
      const css = cssParts.filter(Boolean).join('\n')

      let js: string

      if (!scriptCode && renderCode) {
        // Template-only SFC
        renderCode = rewriteVueImports(renderCode)
          .replace(/^export function/gm, 'function')
        js = `const __component__ = Vue.defineComponent({ render })\n${renderCode}`
      }
      else if (scriptCode) {
        js = rewriteVueImports(scriptCode)
          .replace(/export default /g, 'const __component__ = ')
          .replace(/Object\.defineProperty\(__returned__,\s*['"]__isScriptSetup['"],\s*\{[^}]+\}\s*\)\s*\n?/g, '')

        if (renderCode) {
          renderCode = rewriteVueImports(renderCode)
            .replace(/^export function/gm, 'function')
          js += `\n${renderCode}\n__component__.render = render`
        }
        else {
          js += '\n__component__'
        }

        if (descriptor.styles.some(s => s.scoped)) {
          js += `\n;if(__component__.__scopeId == null) __component__.__scopeId = '${id}'`
        }
      }
      else {
        return { js: '', css: '', error: 'No script or template found' }
      }

      js = `(function(){\n${js}\nreturn __component__\n})()`

      return { js, css }
    }
    catch (e) {
      return { js: '', css: '', error: (e as Error).message }
    }
  }

  return { compileSfc }
}
