import type { TemplateOptions } from './types'

export const templates = {
  'vue': (options?: TemplateOptions) => import('./vue').then(m => m.default(options)),
  'html': (options?: TemplateOptions) => import('./html').then(m => m.default(options)),
  'vue-sass': (options?: TemplateOptions) => import('./vue-sass').then(m => m.default(options)),
}
