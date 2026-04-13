export type StringOrRegExp = string | RegExp

export interface GuideIgnoredFiles { overwrite: boolean, patterns: StringOrRegExp[] }

export interface GuideMeta {
  features?: PlaygroundFeatures
  layout?: GuideLayoutPolicy
  startingFile?: string
  startingUrl?: string
  /**
   * Template to use for this guide ('vue' or 'html')
   * @default 'vue'
   */
  template?: 'vue' | 'html'
  // TODO:
  packageJsonOverrides?: any
  /**
   * When not provided, this will be loaded from './files' directory
   */
  files?: Record<string, string>
  // TODO:
  solutions?: Record<string, string>

  /**
   * Ignored file patterns.
   * Can be a list of strings or regex.
   *
   * @example
   * // add to default patterns
   * ignoredFiles: ['pnpm-lock.yaml']
   *
   * @example
   * // overwrite default patterns
   * ignoredFiles: { overwrite: true, patterns: ['pnpm-lock.yaml'] }
   */
  ignoredFiles?: StringOrRegExp[] | GuideIgnoredFiles
}

export interface PlaygroundFeatures {
  terminal?: boolean
  fileTree?: boolean
  download?: boolean
  navigation?: boolean
}

export interface GuideLayoutPolicy {
  docsOnly?: boolean
}
