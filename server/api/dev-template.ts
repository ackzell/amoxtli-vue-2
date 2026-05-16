import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const path = query.path as string
  if (!path)
    return {}

  const fullPath = resolve(process.cwd(), 'content', path)
  if (existsSync(fullPath)) {
    try {
      const content = readFileSync(fullPath, 'utf-8')
      return { content }
    }
    catch (e) {
      return {}
    }
  }
  return {}
})
