# VueLive (Lightweight SFC Live Editor)

A lightweight live-editing component for Vue SFCs inside Nuxt Content
markdown. Uses Monaco (no Volar), Shiki tokenization, and
`@vue/compiler-sfc` — all in the browser.

---

## Architecture

```
┌───────────────────────────────────────────────────────────┐
│  nuxt.config.ts                                           │
│  content:file:beforeParse                                 │
│                                                           │
│  Detects ```vue live fences →                             │
│  :vue-live{code="<base64>" hide="..." showLineNumbers=}   │
└──────────┬────────────────────────────────────────────────┘
           │ MDC renders
           ▼
┌───────────────────────────────────────────────────────────┐
│  VueLive.client.vue                                       │
│                                                           │
│  ┌───────────────────────────────────────┐                │
│  │  Preview (iframe, srcdoc)             │                │
│  │  Compiled JS + CSS rendered here      │                │
│  └───────────────────────────────────────┘                │
│  ┌───────────────────────────────────────┐                │
│  │  Monaco Editor (Shiki-themed)         │                │
│  │  - Hidden areas via setHiddenAreas    │                │
│  │  - Auto-grow height                   │                │
│  │  - Reset button on hover              │                │
│  └───────────────────────────────────────┘                │
└──────────┬────────────────────────────────────────────────┘
           │ on change (300ms debounce)
           ▼
┌───────────────────────────────────────────────────────────┐
│  useSfcCompiler (compileSfc)                              │
│                                                           │
│  compileTemplate + compileScript + compileStyle           │
│  → IIFE returning component object                        │
│  → inline CSS string                                      │
└──────────┬────────────────────────────────────────────────┘
           │
           ▼
┌───────────────────────────────────────────────────────────┐
│  useSandboxPreview (render)                               │
│                                                           │
│  Creates srcdoc iframe with:                              │
│  - Vue runtime (from CDN, cached as blob URL)             │
│  - Compiled component JS                                  │
│  - Compiled CSS                                           │
└───────────────────────────────────────────────────────────┘
```

---

## Key Files

| File | Role |
|---|---|
| `components/content/VueLive.client.vue` | Main component: Monaco init, compile orchestration, reset, hidden areas |
| `composables/useSfcCompiler.ts` | Wraps `@vue/compiler-sfc`, rewrites `import { x } from 'vue'` to `const x = Vue.x`, strips `__isScriptSetup` guard, returns `{ js, css, error }` |
| `composables/useSandboxPreview.ts` | Iframe srcdoc management, theme toggle via `?dark` param in blob URL |
| `composables/useVueRuntime.ts` | Fetches Vue prod build from unpkg, caches as blob URL, extracts real version from header comment |
| `monaco/language-configs.ts` | Vue language config for Monaco (auto-closing pairs, surrounding pairs, brackets) |
| `monaco/shiki.ts` | Shiki highlighter setup with custom themes (`amoxtli-light`, `vesper`) |
| `nuxt.config.ts` (lines 334–358) | `content:file:beforeParse` hook — live fence detection, `hide`/`showLineNumbers` parsing |

---

## How Compilation Works

1. User types in Monaco → `onDidChangeModelContent` fires
2. Debounced (300ms) → `compileSfc(currentCode)` is called
3. `compileSfc` calls `@vue/compiler-sfc`:
   - `parse()` → AST
   - `compileScript()` → `<script setup>` becomes `setup()` function
   - `compileTemplate()` → template becomes `render()` function (outputs `import { ... } from "vue"`)
   - `compileStyle()` → scoped CSS becomes plain CSS string
4. **Import rewriting**: All `import { x } from 'vue'` statements in compiled output are rewritten to `const x = Vue.x` (Vue global available in srcdoc)
5. **`__isScriptSetup` stripping**: Vue 3.5+ adds `Object.defineProperty(__returned__, '__isScriptSetup', ...)` in compiled output, which causes `hasSetupBinding` to return `false` for all keys. This line is removed.
6. Result wrapped in IIFE returning component object → `render(js, css)` updates the iframe preview

### Limitations

- `<style lang="scss"` etc. won't work — only plain `<style>` (PostCSS is available in-browser in Vue 3.5, but preprocessors are not)
- Single-file components only — no multi-file imports

---

## Code Hiding (`hide` prop)

Lines can be hidden via Monaco's internal `setHiddenAreas` API. Hidden lines
are **permanently invisible** (no expand/collapse button) but are still
compiled for the preview.

### Usage in Markdown

````md
```vue live hide={2-14,16-20}
```
````

Comma-separated ranges, 1-indexed line numbers.

### How It Works

1. `nuxt.config.ts` parses `hide={...}` from the fence info string:
   ```ts
   const hideMatch = (`${before} ${after}`).match(/hide=\{([^}]+)\}/)
   ```
2. Passed as a prop to `VueLive`: `hide="2-14,16-20"`
3. On mount, `applyHiddenAreas()` parses ranges and calls:
   ```ts
   (editor as any).setHiddenAreas(ranges)
   ```
4. On reset, the original code is restored via `model.applyEdits()` rather
   than `editor.setValue()` — this avoids clearing Monaco's hidden areas
   state (a known quirk of the unstable `setHiddenAreas` API).

### Why `model.applyEdits()` instead of `editor.setValue()`

`editor.setValue()` resets Monaco's internal view model, which clears any
hidden areas set via `setHiddenAreas`. Even re-applying hidden areas
synchronously in `onDidChangeModelContent` or deferring via `nextTick` is
unreliable.

`model.applyEdits()` feeds the content change through the normal edit
pipeline, which preserves the view model's hidden areas state. Hidden areas
set on mount remain intact across resets without needing to re-apply.

---

## Show Line Numbers

Controlled by the `showLineNumbers` prop, passed as a boolean to Monaco's
`lineNumbers: 'on' | 'off'` option.

### Usage in Markdown

````md
```vue live showLineNumbers
```
````

Or explicitly:

````md
```vue live showLineNumbers=false
```
````

Parsed in nuxt.config.ts:
```ts
const slnMatch = (`${before} ${after}`).match(
  /showLineNumbers(?:=\s*(?:\{\s*)?(true|false)\s*\}?)?/
)
```

---

## Monaco Setup

- **No Volar / Vue language service** — only core editor + Shiki tokenization
- Worker: only `editorWorker` (no TS worker)
- Themes: `amoxtli-light` (light) / `vesper` (dark) via Shiki → Monaco bridge
- Font: `DM Mono, monospace`, size 13
- `wordWrap: 'on'`, `minimap: false`, `folding: false`, `glyphMargin: false`
- Auto-grow: editor height adjusts to content (60–600px) via
  `onDidContentSizeChange` + `getContentHeight()`

### Layout

- Mobile (<768px): preview above, editor below
- Desktop (≥768px): editor left, preview right
- Preview has `min-height: 80px` and flex-centers its content
- Reset button floats over the editor's top-right corner, visible on hover

---

## Reset Behavior

The reset button (visible on hover) restores the editor to its original
content while preserving:

1. Hidden areas remain hidden (via `model.applyEdits()`)
2. Monaco undo stack (a new undo stop is created)
3. Preview recompiles immediately

The reset button only renders when `originalCode` is non-empty (i.e., the
component was given code to begin with). It does NOT have a disabled
state — clicking reset with unchanged code is a no-op (guarded by
`currentCode.value === originalCode.value`).

---

## Related

- `docs/preview-system.md` — the older WebContainer-based preview (used for
  full project previews with Vite dev server)
