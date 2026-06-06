function inferLanguageFromFile(filePath: string) {
  const ext = filePath.split('.').pop()?.toLowerCase()
  if (!ext)
    return 'text'

  if (ext === 'vue')
    return 'vue'
  if (ext === 'ts')
    return 'ts'
  if (ext === 'tsx')
    return 'tsx'
  if (ext === 'js')
    return 'js'
  if (ext === 'jsx')
    return 'jsx'
  if (ext === 'mjs')
    return 'js'
  if (ext === 'cjs')
    return 'js'
  if (ext === 'json')
    return 'json'
  if (ext === 'html')
    return 'html'
  if (ext === 'css')
    return 'css'
  if (ext === 'scss')
    return 'scss'
  if (ext === 'md')
    return 'md'
  if (ext === 'yml' || ext === 'yaml')
    return 'yaml'
  if (ext === 'sh')
    return 'bash'

  return ext
}

function getTitleFromPath(filePath: string) {
  return filePath.split('/').filter(Boolean).pop() || filePath
}

function walk(node: any, onCode: (codeNode: any) => void) {
  if (!node || typeof node !== 'object')
    return

  if (node.type === 'code')
    onCode(node)

  if (!Array.isArray(node.children))
    return

  for (const child of node.children)
    walk(child, onCode)
}

export default function remarkEcCodeSyntax() {
  return (tree: any) => {
    walk(tree, (node) => {
      if (typeof node.lang !== 'string' || (!node.lang.startsWith('file:') && !node.lang.startsWith('solution:')))
        return

      const isSolution = node.lang.startsWith('solution:')
      const prefix = isSolution ? 'solution:' : 'file:'
      const filePath = node.lang.slice(prefix.length).trim()
      if (!filePath)
        return

      const currentMeta = typeof node.meta === 'string' ? node.meta.trim() : ''
      const hasTitle = /(?:^|\s)title=/.test(currentMeta)
      const nextMetaParts = [
        currentMeta,
        `${prefix}${filePath}`,
        hasTitle ? '' : `title="${getTitleFromPath(filePath)}"`,
      ].filter(Boolean)

      node.lang = inferLanguageFromFile(filePath)
      node.meta = nextMetaParts.join(' ')
    })
  }
}
