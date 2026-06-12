# VueLive (Lightweight SFC Live Editor)

A lightweight live-editing component for Vue SFCs inside Nuxt Content
markdown. Uses Monaco (no Volar), Shiki tokenization, and
`@vue/compiler-sfc` — all in the browser.

---

## Architecture

````
┌───────────────────────────────────────────────────────────┐
│  nuxt.config.ts                                           │
│  content:file:beforeParse                                 │
│                                                           │
│  Detects ```vue live fences →                             │
│  :vue-live{code="<base64>" hide="..."                      │
│  showLineNumbers showConsole showPreview}                  │
└──────────┬────────────────────────────────────────────────┘
           │ MDC renders
           ▼
┌───────────────────────────────────────────────────────────┐
│  VueLive.client.vue                                       │
│                                                           │
│  ┌───────────────────────────────────────┐                │
│  │  Preview (iframe, srcdoc)             │                │
│  │  - Reload button (manual recompile)   │                │
│  │  - Console (if showConsole)           │                │
│  └───────────────────────────────────────┘                │
│  ┌───────────────────────────────────────┐                │
│  │  Monaco Editor (Shiki-themed)         │                │
│  │  - Hidden areas via setHiddenAreas    │                │
│  │  - Auto-grow height                   │                │
│  │  - Reset button on hover              │                │
│  └───────────────────────────────────────┘                │
│                                                           │
│  watch(blobUrl) → auto-recompile once runtime loads       │
│  watch(theme)   → re-render on dark/light toggle          │
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
````

---

## Key Files

| File                                    | Role                                                                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `components/content/VueLive.client.vue` | Main component: Monaco init, compile orchestration, reset, hidden areas                                                                          |
| `composables/useSfcCompiler.ts`         | Wraps `@vue/compiler-sfc`, rewrites `import { x } from 'vue'` to `const x = Vue.x`, strips `__isScriptSetup` guard, returns `{ js, css, error }` |
| `composables/useSandboxPreview.ts`      | Iframe srcdoc management, theme toggle via `?dark` param in blob URL                                                                             |
| `composables/useVueRuntime.ts`          | Fetches Vue dev build (`vue.global.js`) from unpkg, caches as blob URL, extracts real version from header comment                                 |
| `monaco/language-configs.ts`            | Vue language config for Monaco (auto-closing pairs, surrounding pairs, brackets)                                                                 |
| `monaco/shiki.ts`                       | Shiki highlighter setup with custom themes (`amoxtli-light`, `vesper`)                                                                           |
| `composables/useConsoleOutput.ts`       | Shared LunaConsole lifecycle, theme management, log deserialization for both VueLive and Playground                                                |
| `templates/console-interceptor.ts`      | Console interceptor injected into preview iframes — detects reactive objects, refs, DOM elements, errors, etc.                                    |
| `i18n/locales/en.yaml`                  | i18n keys: `vue-live.reset-contents`, `vue-live.reload-preview`, `vue-live.clear-console`                                                         |
| `nuxt.config.ts` (lines 334–358)        | `content:file:beforeParse` hook — live fence detection, `hide`/`showLineNumbers` parsing                                                         |

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

## Vue Runtime Loading

The Vue library is loaded from CDN (`unpkg.com`) as a global build and served
to the preview iframe via a blob URL.

### Dev Build

Uses the **development** build (`vue.global.js`) instead of the production
build. This provides Vue's dev-mode warnings and better error messages in the
preview console.

### Caching

The runtime is fetched once and cached globally (`fetchRuntime()` in
`composables/useVueRuntime.ts`). Subsequent page navigations reuse the cached
blob URL without a network request.

### Race Condition Handling

The initial `onMounted` flow calls `doCompile()` before the Vue runtime fetch
completes. `render()` bails out when `blobUrl` is empty, showing a "Loading
Vue runtime..." placeholder. A `watch(blobUrl)` in `VueLive.client.vue` catches
the moment the runtime finishes loading and re-compiles automatically:

```ts
watch(blobUrl, (url) => {
  if (url && currentCode.value) {
    doCompile()
  }
})
```

This ensures the preview renders as soon as the runtime is available, even on
a cold cache. If the runtime is already cached, `doCompile()` on mount finds
`blobUrl` set and renders immediately.

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
- Font: `Ubuntu Mono, monospace`, size 13
- `wordWrap: 'on'`, `minimap: false`, `folding: false`, `glyphMargin: false`
- Auto-grow: editor height adjusts to content (60–600px) via
  `onDidContentSizeChange` + `getContentHeight()`

### Layout

- Mobile (<768px): preview above, editor below
- Desktop (≥768px): editor left, preview right
- Preview has `min-height: 200px` and flex-centers its content
- **Reset button** floats over the editor's top-right corner, visible on hover
- **Reload button** floats over the preview's top-right corner, visible on hover
- **Clear console button** floats over the console's top-right corner, visible on hover

### DI Service Registration

`monaco-editor-core`'s standalone entry point does not register all
singletons that editor contributions depend on. Five services are missing:

| Service                | Module                                                   |
| ---------------------- | -------------------------------------------------------- |
| `ICodeLensCache`       | `editor/contrib/codelens/browser/codeLensCache`          |
| `IInlayHintsCache`     | `editor/contrib/inlayHints/browser/inlayHintsController` |
| `ISuggestMemories`     | `editor/contrib/suggest/browser/suggestMemory`           |
| `IActionWidgetService` | `platform/actionWidget/browser/actionWidget`             |
| `ITreeViewsDnDService` | `editor/common/services/treeViewsDndService`             |

Without them, contributions like `CodeLensContribution2` throw
`depends on UNKNOWN service <X>` at runtime.

These modules are loaded via dynamic `import()` inside `onMounted` alongside
the Monaco API entry point, using `Promise.all` so they resolve before any
Monaco API function is called:

```ts
const [monaco] = await Promise.all([
  import('monaco-editor-core/esm/vs/editor/editor.api'),
  import('.../codeLensCache'),
  import('.../inlayHintsController'),
  import('.../suggestMemory'),
  import('.../actionWidget'),
  import('.../treeViewsDndService'),
])
```

Each module calls `registerSingleton(ServiceId, Impl)` at evaluation time,
which populates Monaco's DI registry before `StandaloneServices.initialize()`
runs. This avoids both:

- **SSR crash**: Dynamic imports are client-side only (inside `onMounted`)
- **UNKNOWN service errors**: Services exist before contributions instantiate

The type declarations for these internal modules live in
`types/shim.d.ts`.

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

## Preview Controls

### Reload Button

A `i-mynaui-rewind` icon button floats over the preview's top-right corner
(visible on hover). Clicking it calls `doCompile()` to force a full
re-compile and re-render of the preview.

Useful for:
- Manually re-triggering the preview when it didn't render on first load
- Clearing transient iframe state (e.g., after a runtime error)

```html
<IconButton
  :tooltip="$t('vue-live.reload-preview')"
  @click="doCompile"
/>
```

### `refreshPreview()`

Re-renders the last compiled result without re-compiling:

```ts
function refreshPreview() {
  if (lastResult.value) {
    render(lastResult.value.js, lastResult.value.css, ...)
  }
}
```

Used by the theme watcher to update the preview when toggling dark/light
mode without an unnecessary re-compile.

### `showPreview` Prop

Controls whether the iframe is visible via `v-show`:

```html
<iframe v-show="props.showPreview" ref="iframeEl" ... />
```

Default: `true`. Set to `false` in a markdown fence to hide the preview:

````md
```vue live showPreview=false
```
````

---

## Theme Sync

When the user toggles dark/light mode:

1. `watch(theme)` fires (computed from `colorMode.value`)
2. Monaco editor theme switches via `monaco.editor.setTheme()`
3. `refreshPreview()` re-renders the iframe with the new theme's
   background/foreground colors

The theme colors are defined in `useSandboxPreview.ts`:

```ts
const themeColors = {
  light: { bg: '#fafafa', fg: '#101010' },
  dark:  { bg: '#101010', fg: '#fafafa' },
}
```

---

## Console Panel

When `showConsole` is set on the fence (e.g. ` ```vue live showConsole `),
`VueLive.client.vue` injects the console interceptor script into the preview
iframe's srcdoc, and renders a 150px console below the preview on the right
panel (desktop) or below the editor (mobile).

**Desktop layout:**

```
┌──────────────┬──────────────────────┐
│              │  Preview  [↺]        │
│   Editor     ├──────────────────────┤
│              │  Console (150px) [⌧] │
└──────────────┴──────────────────────┘
```

[↺] = Reload preview button
[⌧] = Clear console button

### Clear Console Button

A `i-carbon-clean` icon button floats over the console's top-right corner
(visible on hover). Clicking it calls `consoleOutput.clearLogs(true)` to
clear all console output.

### Architecture

```
iframe console.log
  → interceptor overrides console.*
  → postMessage({ source: 'nuxt-playground-frame', ... })
  → handleConsoleMessage()
  → consoleOutput.addLog()  (useConsoleOutput composable)
    → deserializeMessage()
    → lunaConsole.log(...)
```

### Reactive Object Detection

The interceptor (`templates/console-interceptor.ts`) detects:
- **Vue reactive objects** via both `window.Vue.isReactive()` (global build)
  and `__v_isReactive` (ESM build), serializing them as `Reactive` objects
  with their handler type (`MutableReactiveHandler`, `ReadonlyReactiveHandler`,
  etc.) and a slice of their properties.
- **Vue refs** via `__v_isRef`, serialized as `Ref` objects.

This ensures `Proxy(Object)` rendering in both VueLive and Playground contexts.

### Shared Composable

Both `VueLive.client.vue` and `PanelConsole.client.vue` share the same
console logic via `composables/useConsoleOutput.ts`, which wraps
LunaConsole lifecycle, theme management, and deserialization via
`composables/useConsoleDeserializer.ts`. Each component filters messages
by `event.source === iframe.contentWindow` to prevent cross-contamination
between iframes.

## Related

- `docs/preview-system.md` — the older WebContainer-based preview (used for
  full project previews with Vite dev server)
