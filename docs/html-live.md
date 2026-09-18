# HtmlLive (Raw HTML Live Editor)

A live-editing component for raw HTML snippets inside Nuxt Content markdown.
Same UX as [VueLive](vue-live) (Monaco editor, preview, console, reset) but
there is no compilation step — the source HTML **is** the preview.

---

## Usage

````md
```html live showConsole
<button id="my-button">Click me</button>

<script>
  document.querySelector('#my-button').addEventListener('click', () => {
    console.log('Button clicked!')
  })
</script>
```

```html live hide={2-4}
<style>
  .card { padding: 16px; border: 1px solid #ddd; }
</style>
<div class="card">Hello</div>
```
````

Supported props (same parsing as VueLive):

| Prop                  | Fence syntax        | Default |
| --------------------- | ------------------- | ------- |
| `showConsole`         | `showConsole`       | `false` |
| `showPreview`         | `showPreview=false` | `true`  |
| `showLineNumbers`     | `showLineNumbers`   | `false` |
| `hide`                | `hide={2-5,8}`      | —       |

> `lang` (default `'html'`) is passed through from the fence info string but
> currently unused — the Monaco language is always `html`.

---

## Architecture

```
nuxt.config.ts content:file:beforeParse
  → detects ```html live fences
  → :html-live{code="<base64>" ...}   (vue fences still emit :vue-live)
        │ MDC renders
        ▼
HtmlLive.client.vue
  ├─ Monaco editor (html, Shiki tokenization)
  ├─ iframe srcdoc:
  │    <body>
  │      <script> console interceptor          (always injected)
  │      <script> uncaught-error overlay       (always injected)
  │      ${userHtml}
  └─ Console panel (when showConsole)
```

### Preview rendering

`composables/useHtmlSandboxPreview.ts` builds the iframe `srcdoc` directly —
no Vue runtime, no blob URL, no compile step. The user snippet is placed
verbatim in `<body>`. Any `<style>` works; a full-document `<html>`/`<head>`
snippet will still render (browsers are lenient) but is not recommended.

### Script execution order

Inline `<script>` blocks in the snippet are hoisted to the end of `<body>`
(everything else keeps its position). This mirrors CodePen / W3Schools
behavior: scripts run after the DOM is parsed, so a `<script>` that appears
*before* its `<button>` still sees the button. There's no need to wait for
`DOMContentLoaded` — but note that `document.write()` will not work.

### Console

The shared console interceptor (`templates/console-interceptor.ts`) is
**always** injected so `console.*` works whether or not `showConsole` is set.
Messages are relayed via `postMessage` and rendered with the shared
`useConsoleOutput` composable (same as VueLive). When the console panel is
hidden the messages are simply dropped (no listener).

### Uncaught errors

A small overlay script is always injected. It listens for `window.error` and
`unhandledrejection` and paints a fixed red `<pre>` at the bottom of the
preview, so runtime errors are visible even without the console panel.

---

## Monaco

Same setup as VueLive (`monaco-editor-core` + Shiki tokenization bridge):

- `monaco.languages.register({ id: 'html' })` + the `html` language
  configuration in `monaco/language-configs.ts`
- HTML grammar is loaded into the shared highlighter (`monaco/shiki.ts`), so
  `shikiToMonaco` registers the tokens provider
- Same editor options, auto-grow, `hide` via `setHiddenAreas`, reset via
  `model.applyEdits()`
- A title bar above the editor/preview shows the HTML logo
  (`i-logos-html-5`) and an `html-live.title` label, mirroring fenced-code
  headers

---

## Limitations

- No sandbox on the iframe — inline scripts execute with the page's own origin
- The console interceptor is only as robust as its serialization heuristics
- No Vue runtime; `window.Vue` is undefined unless the snippet loads it itself
- External `<script src>` / resources may be blocked by the site's
  `Cross-Origin-Embedder-Policy: require-corp` headers