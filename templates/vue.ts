import type { TemplateOptions } from './types'
import template from '#build/templates/vue'

export default function load(options: TemplateOptions = {}) {
  if (import.meta.server)
    throw new Error('This template can only be used on the client')

  const rawFiles: Record<string, string> = {
    ...template,
    ...options.files,
  }

  return rawFiles
}
