import { extname } from 'pathe'

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.webp',
  '.avif',
  '.woff',
  '.woff2',
  '.eot',
  '.ttf',
])

export function isBinaryFile(filepath: string): boolean {
  return BINARY_EXTENSIONS.has(extname(filepath).toLowerCase())
}
