import type { GuideMeta } from '~/types/guides'

export const meta: GuideMeta = {
  template: 'vue',
  startingFile: 'src/App.vue',
  features: {
    defaultLayout: 'docs',
    fileTree: false,
    terminal: true,
  },
  ignoredFiles: ['package.json', 'main.js', 'tsconfig.node.json', 'vite.config.ts', 'App.vue', 'index.html', 'src/main.ts'],
  sessionName: 'the-modifiers',
}
