import type { TemplateOptions } from './types'

export const templates = {
  basic: (options?: TemplateOptions) => import('./basic').then(m => m.default(options)),
  vue: (options?: TemplateOptions) => import('./basic').then(m => m.default(options)),
  html: (options?: TemplateOptions) => import('./html').then(m => m.default(options)),
}
