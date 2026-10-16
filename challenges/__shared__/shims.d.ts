/**
 * Ambient module type for mounting components from source in Vue templates.
 * The generated suite lives in `__challenge__/` and imports the learner's
 * component relative to it; Vite resolves this at runtime.
 *
 * Source-inspection checks do NOT use `*.vue?raw` (Vite caches the raw module
 * and never re-transforms it on edit). Read source through `ctx.source(path)`
 * instead — see `docs/challenge-banking.md` -> "Source-inspection checks".
 */
declare module '*.vue' {
  const component: any
  export default component
}
