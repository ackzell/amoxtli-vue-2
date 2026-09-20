/**
 * `diff@5` ships no bundled type declarations. Ambient types for the subset
 * of the jsdiff API used by the handrolled diff component.
 */
declare module 'diff' {
  export interface Change {
    /** The changed text chunk. */
    value: string
    /** Number of tokens/lines in the chunk. */
    count?: number
    /** True if the chunk was added in the new string. */
    added?: boolean
    /** True if the chunk was removed from the old string. */
    removed?: boolean
  }

  export interface DiffOptions {
    /** Ignore whitespace differences when computing line diffs. */
    ignoreWhitespace?: boolean
    /** Treat the final newline as part of the line token. */
    newlineIsToken?: boolean
    /** Callback to refine hunks after the initial diff. */
    comparator?: (left: string, right: string) => boolean
  }

  export function diffLines(
    oldStr: string,
    newStr: string,
    options?: DiffOptions,
  ): Change[]

  export function diffWords(
    oldStr: string,
    newStr: string,
    options?: DiffOptions,
  ): Change[]

  export function diffChars(
    oldStr: string,
    newStr: string,
    options?: DiffOptions,
  ): Change[]
}
