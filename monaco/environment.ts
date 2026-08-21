/* eslint-disable no-restricted-globals */
/* eslint-disable new-cap */
import editorWorker from 'monaco-editor-core/esm/vs/editor/editor.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'

import vueWorker from './vue.worker?worker'

let installed = false

/**
 * Installs the global `MonacoEnvironment.getWorker` exactly once.
 *
 * Both the playground editor and VueLive editors share `window.MonacoEnvironment`,
 * so every consumer must go through this installer instead of assigning the
 * global directly (assigning would clobber the other's worker mapping and make
 * e.g. the Vue language service fall back to the plain editor worker, which
 * cannot load its foreign module).
 */
export function ensureMonacoEnvironment() {
  if (installed)
    return
  installed = true

  self.MonacoEnvironment = {
    async getWorker(_: any, label: string) {
      switch (label) {
        case 'typescript':
        case 'javascript':
        case 'vue':
          return new vueWorker()

        case 'json':
          return new jsonWorker()

        case 'css':
        case 'scss':
        case 'less':
          return new cssWorker()

        case 'html':
        case 'handlebars':
        case 'razor':
          return new htmlWorker()

        default:
          return new editorWorker()
      }
    },
  }
}
