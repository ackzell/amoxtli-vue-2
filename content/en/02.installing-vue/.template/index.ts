import type { GuideMeta } from '~/types/guides'

export const meta: GuideMeta = {
  startingFile: 'index.html',
  features: {
    terminal: false,
    fileTree: true,
    navigation: true,
  },
  template: 'html',
  ignoredFiles: ['main.js', 'style.css', 'vite.config.js', 'package.json'],
}
