import * as monaco from 'monaco-editor-core'

import { reloadLanguageTools } from './env'
import { ensureMonacoEnvironment } from './environment'
import * as languageConfigs from './language-configs'

export function initMonaco(ctx: PlaygroundStore) {
  ensureMonacoEnvironment()

  monaco.languages.register({ id: 'vue', extensions: ['.vue'] })
  monaco.languages.register({ id: 'javascript', extensions: ['.js'] })
  monaco.languages.register({ id: 'typescript', extensions: ['.ts'] })
  monaco.languages.register({ id: 'json', extensions: ['.json'] })
  monaco.languages.register({ id: 'html', extensions: ['.html'] })

  // set language configurations
  monaco.languages.setLanguageConfiguration('vue', languageConfigs.vue)
  monaco.languages.setLanguageConfiguration('javascript', languageConfigs.ts)
  monaco.languages.setLanguageConfiguration('typescript', languageConfigs.ts)

  monaco.languages.onLanguage('vue', () => reloadLanguageTools(ctx))
}
