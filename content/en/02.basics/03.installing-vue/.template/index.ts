import type { GuideMeta } from '~/types/guides'

export const meta: GuideMeta = {
  startingFile: 'index.html',
  features: {
    defaultLayout: 'split',
    terminal: false,
    fileTree: true,
  },
  template: 'html',
  ignoredFiles: ['main.js', 'style.css', 'vite.config.js', 'package.json'],
}
