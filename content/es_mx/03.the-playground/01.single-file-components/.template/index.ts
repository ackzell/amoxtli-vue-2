import type { GuideMeta } from '~/types/guides'

export const meta: GuideMeta = {
  features: {
    defaultLayout: 'split',
    fileTree: false,
    terminal: true,
  },
  sessionName: 'single-file-components',
  template: 'vue-sass',
  startingFile: 'src/App.vue',
  ignoredFiles: ['package.json', 'main.js', 'tsconfig.node.json', 'vite.config.ts', 'App.vue', 'index.html', 'src/main.ts'],
}
