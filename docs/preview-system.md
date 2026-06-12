# Live Code Preview System

## Architecture Overview

The live preview is a **WebContainer-based** system where user code runs in a **real, full Node.js environment inside the browser** (via `@webcontainer/api`). The preview output is displayed inside an **iframe**, communicating with the parent page via **`postMessage`-based RPC** (using the `birpc` library).

### High-Level Flow

1. **Templates** (`templates/vue/`, `templates/html/`, `templates/vue-sass/`) define base project files (e.g., a Vite + Vue project)
2. A **Nuxt build module** (`modules/template-loader.ts`) reads these directories at build time and produces virtual modules (`#build/templates/vue`, etc.)
3. When the user navigates to a lesson, the **guide store** (`stores/guide.ts`) calls `playgroundStore.mount()` with the lesson's custom files
4. The **playground store** (`stores/playground.ts`) boots a **WebContainer**, mounts files into its virtual filesystem, installs deps (`pnpm install`), and starts a **Vite dev server** inside the container
5. The dev server's URL is captured, stored in the **preview store** (`stores/preview.ts`), and rendered in the **`PanelPreviewClient`** iframe
6. The iframe and parent communicate via **RPC over `postMessage`** for color mode sync, version info, and console output

---

## Key Files

### Preview Panel Components

| File                                       | Purpose                                                                                                                    |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `components/PanelPreview.vue`              | Container: URL bar, refresh button, info dropdown. Loads `PanelPreviewLoading` and `PanelPreviewClient` as async children. |
| `components/PanelPreviewClient.client.vue` | The actual iframe that shows the live preview. Sets up birpc RPC with the iframe content. Exposes the `iframe` ref.        |
| `components/PanelPreviewLoading.vue`       | Loading overlay: shows init/mount/install/start/polling status steps before the preview is ready.                          |
| `components/PlaygroundCodeDockNode.vue`    | Docking container: orchestrates which panel (editor, preview, console, terminal) renders in each dock slot.                |

### Stores

| File                   | Purpose                                                                                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `stores/preview.ts`    | Stores `location` (origin + fullPath), `url` (combined), `clientInfo` (Vue/Nuxt versions), and `pendingFullPath`. Provides `updateUrl()` and `setFullPath()`.                                                      |
| `stores/playground.ts` | Boots WebContainer (`WebContainer.boot()`), mounts files, runs `pnpm install`, starts Vite dev server, tracks status (init/mount/install/start/polling/ready/interactive/error). Handles HMR for template changes. |
| `stores/guide.ts`      | Calls `playgroundStore.init()` then `playgroundStore.mount()` with lesson-specific files. Tracks showing solutions, features, embedded docs.                                                                       |

### Templates

| File                    | Purpose                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `templates/index.ts`    | Dynamic import map for the three template types (vue, html, vue-sass)                 |
| `templates/types.ts`    | `TemplateOptions` interface (files + nuxtrc)                                          |
| `templates/vue.ts`      | Loads `#build/templates/vue` virtual module and merges with lesson-specific files     |
| `templates/html.ts`     | Same for HTML template                                                                |
| `templates/vue-sass.ts` | Same for Vue+Sass template                                                            |
| `templates/utils.ts`    | `filesToWebContainerFs()` - converts `VirtualFile[]` to WebContainer `FileSystemTree` |

### Template Files (on-disk, read at build time)

| File                                | Purpose                                                    |
| ----------------------------------- | ---------------------------------------------------------- |
| `templates/vue/index.html`          | Base HTML shell                                            |
| `templates/vue/src/main.ts`         | Vue app bootstrap + RPC bridge setup                       |
| `templates/vue/src/App.vue`         | Default "Vue 3 Playground" demo component                  |
| `templates/vue/vite.config.ts`      | Vite config with color mode injection plugin               |
| `templates/vue/package.json`        | Dependencies: `vue`, `birpc`, `vite`, `@vitejs/plugin-vue` |
| `templates/html/index.html`         | Minimal HTML template for plain JS demos                   |
| `templates/html/server.js`          | Node.js HTTP server (not Vite) for HTML template           |
| `templates/html/main.js`            | Minimal JS for HTML template                               |
| `templates/vue-sass/index.html`     | Same as vue template                                       |
| `templates/vue-sass/src/main.ts`    | Same RPC bridge as vue template                            |
| `templates/vue-sass/vite.config.ts` | Same color mode injection + Sass preprocessor options      |

### Communication / Types

| File                               | Purpose                                                                                                                                              |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `templates/console-interceptor.ts` | Injected into all HTML files at mount time. Intercepts `console.log/warn/error/info/debug/table/dir` and sends them via `postMessage` to the parent. |
| `types/rpc.ts`                     | `FrameFunctions` (parent calls on iframe: `onColorModeChange`) and `ParentFunctions` (iframe calls on parent: `onReady`, `onNavigate`)               |
| `types/console-output.ts`          | `LogPayload` and `LogLevel` types                                                                                                                    |

---

## How the Iframe Preview Works

### A. Template Loading

1. **Build time**: The `template-loader` module reads `templates/vue/`, `templates/html/`, `templates/vue-sass/` directories and generates virtual modules (`#build/templates/vue`, etc.) containing all file paths and their contents as a JSON-serialized `Record<string, string>`.
2. **Runtime**: When a lesson loads, `guide.mount()` calls `playgroundStore.mount(files, templateName)`.
3. In `playgroundStore.mount()`:
   ```ts
   const templates = templatesMap[templateName] // pre-loaded template files
   const objects = { ...templates, ...map } // merge with lesson files
   ```
   The merged file map includes everything: `index.html`, `package.json`, `vite.config.ts`, `src/main.ts`, `src/App.vue`, etc.
4. **Console interceptor injection**: For any `.html` file, `VirtualFile.fsTransform` is set to `injectHtmlScripts`, which prepends the console interceptor `<script>` before `</head>`. This happens only when writing to the WebContainer FS, not in the editor.

### B. WebContainer Lifecycle

1. `playgroundStore.init()`:
   - Calls `WebContainer.boot()` (a WASM-based full Node.js environment in the browser)
   - Loads templates via dynamic imports
   - Mounts files into the container using `wc.mount(filesToWebContainerFs(...))`
   - Calls `startServer()`
   - Listens to the `server-ready` event

2. `startServer()`:
   - Spawns `pnpm install --prefer-offline` (skipped if `node_modules` already exists)
   - Spawns `pnpm run dev` (runs Vite dev server inside the container on port 5173)
   - Has a fallback timeout of 5s if `server-ready` doesn't fire

3. On `server-ready`:
   ```ts
   wc.on('server-ready', (port, url) => {
     if (port === DEV_SERVER_PORT) {
       preview.location = { origin: url, fullPath: preview.pendingFullPath }
       preview.updateUrl()
       status.value = 'ready'
     }
   })
   ```

### C. Iframe Rendering

1. `preview.url` is set to something like `https://<webcontainer-url>.preview.webcontainer.io/` (or `http://localhost:5173/` in development).
2. `PanelPreview.vue` passes the URL to `PanelPreviewClient.client.vue`:
   ```vue
   <iframe v-if="preview.url" ref="iframe" :src="preview.url" ... />
   ```
3. **No `sandbox` attribute** on the preview iframe — it uses `allow="geolocation; microphone; camera; payment; autoplay; serial; cross-origin-isolated"`.
4. **URL updates**: When the user changes the URL bar or color mode changes, `PanelPreview.vue` calls `refreshIframe(true)`, which constructs a new URL with a `?dark=true/false` query param and sets `iframe.src` directly.

### D. Parent-Iframe Communication (birpc)

**Parent side** (`PanelPreviewClient.client.vue`):

```ts
const functions: ParentFunctions = {
  onReady(info: ClientInfo) { preview.clientInfo = info; syncColorMode() },
  onNavigate(path: string) { preview.location.fullPath = path },
}

rpc = createBirpc<FrameFunctions, ParentFunctions>(functions, {
  post(payload) {
    iframe.value?.contentWindow?.postMessage({ source: 'nuxt-playground-parent', payload }, '*')
  },
  on(fn) {
    window.addEventListener('message', (event) => {
      if (event.source !== iframe.value?.contentWindow)
        return
      if (event.data.source !== 'nuxt-playground-frame')
        return
      fn(event.data.payload)
    })
  },
})
```

**Iframe side** (`templates/vue/src/main.ts`):

```ts
const functions: FrameFunctions = {
  onColorModeChange(mode) {
    document.documentElement.classList.toggle('dark', mode === 'dark')
  },
}

const rpc = createBirpc<ParentFunctions, FrameFunctions>(functions, {
  post(payload) {
    window.parent.postMessage({ source: 'nuxt-playground-frame', payload }, '*')
  },
  on(fn) {
    window.addEventListener('message', (event) => {
      if (event.data.source !== 'nuxt-playground-parent')
        return
      fn(event.data.payload)
    })
  },
})

const clientInfo: ClientInfo = { versionVue: vueVersion, versionNuxt: 'N/A' }
rpc.onReady(clientInfo)
```

**Color mode syncing** has a second path via `postMessage` directly:

- Parent sends: `{ source: 'nuxt-playground-color-mode', mode: 'dark'|'light' }`
- Iframe's Vite plugin injects a script that listens for this message and toggles `class="dark"` on `<html>`

### E. Console Output Flow

1. The **console interceptor** (`templates/console-interceptor.ts`, injected into HTML files via `VirtualFile.fsTransform`) wraps all `console.*` methods. It serializes arguments with rich type metadata and detects Vue reactive objects via `__v_isReactive` (works even when Vue is loaded as ESM without `window.Vue`).
2. When code in the iframe calls `console.log()`, the interceptor calls the original method (so it appears in DevTools) and also sends a serialized payload via `postMessage` with `source: 'nuxt-playground-frame'`.
3. `PanelPreviewClient` listens for these messages (guarded by `event.source` to only accept its own iframe) and calls `(window as any).executeLog(payload)`.
4. `PanelConsole.client.vue` registers `window.executeLog` on mount, which forwards logs through the shared `useConsoleOutput()` composable. The composable lazy-loads LunaConsole, manages the theme, and deserializes the payload back into rich JS objects (including `Proxy(Object)` reconstruction for Vue reactives).
5. Both `VueLive.client.vue` and `PanelConsole.client.vue` share the same console logic via `composables/useConsoleOutput.ts`, preventing drift between the two console implementations.

---

## CSS / Resets

### Main App (does NOT affect the preview)

The main app imports:

- `@unocss/reset/tailwind.css` — Tailwind Preflight reset
- `styles/base.css` — custom base styles (global `min-width: 0`, viewport sizing, etc.)

These cannot reach the preview iframe because the iframe loads from a different origin (the WebContainer URL). Browsers enforce cross-origin isolation.

### Template's Own CSS (applied INSIDE the preview)

The template's `index.html` has an inline reset:

```html
<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  body {
    font-family: -apple-system, ...;
    background: #f5f5f5;
  }
  #app {
    min-height: 100vh;
  }
</style>
```

Plus the Vite config injects dark mode CSS:

```css
html:not(.dark) body {
  background: #ffffff;
  color: #2c3e50;
}
html.dark body {
  background: #101010;
  color: #e5e7eb;
}
body {
  transition:
    background-color 0.15s,
    color 0.15s;
}
```

These are served by the WebContainer's Vite server as part of the iframe's HTML document, so they **do** affect the preview content.

---

## Key Observations

- **No `srcdoc` usage**: The iframe loads content via a real URL (`:src="preview.url"`), not inline `srcdoc`.
- **Two `postMessage` channels**: (1) the **birpc RPC** channel for structured function calls, and (2) a **direct `postMessage`** channel for color mode + console logging.
- **The Vite `playground-color-mode` plugin** injects color mode handling directly into the iframe's HTML at build time, providing instant dark mode without waiting for Vue to mount.
- **Console interceptor is injected at WebContainer write time** (via `VirtualFile.fsTransform`), not in the editor — the user never sees the interceptor code in their file tree.
- **Cross-contamination prevention**: Both `PanelPreviewClient` and `VueLive.client.vue` filter console messages by `event.source === iframe.contentWindow`, so each console instance only processes logs from its own iframe.
- **Shared console composable**: `PanelConsole` and `VueLive` both use `composables/useConsoleOutput.ts`, which wraps LunaConsole lifecycle, theme management, and deserialization via `useConsoleDeserializer`. The `withDomReconstruction` option enables DOM element reconstruction for the playground panel (via `licia/toEl`).

## Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  Main Application (host page)                                    │
│                                                                  │
│  ┌────────────┐   ┌──────────────────┐   ┌───────────────────┐  │
│  │PanelPreview│──▶│PanelPreviewClient│   │ PanelConsole      │  │
│  │ (toolbar)  │   │ (.client.vue)    │   │ (.client.vue)     │  │
│  │            │   │                  │   │                   │  │
│  │ refresh,   │   │ <iframe>         │   │ LunaConsole       │  │
│  │ navigate,  │   │   :src=url       │   │ instance          │  │
│  │ version    │   │                  │   │                   │  │
│  └──────┬─────┘   └────────┬─────────┘   └────────▲──────────┘  │
│         │                  │ postMessage          │             │
│         │                  ▼                      │             │
│         │         birpc RPC bridge                │             │
│         │         (onReady, onNavigate,            │             │
│         │          onColorModeChange)              │             │
│         │                                          │             │
│         │         stores/preview.ts                │             │
│         │         (url, location, clientInfo)      │             │
│         └──────────────────────────────────────────┘             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ stores/playground.ts  (WebContainer orchestrator)        │   │
│  │                                                          │   │
│  │  1. WebContainer.boot()                                  │   │
│  │  2. wc.mount(files)                                      │   │
│  │  3. pnpm install                                         │   │
│  │  4. pnpm run dev (Vite dev server inside container)      │   │
│  │  5. server-ready → preview.url = url                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          │                                       │
│                          ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ WebContainer (in-browser WASM Node.js)                   │   │
│  │                                                          │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │ Vite Dev Server (port 5173)                      │   │   │
│  │  │  - serves index.html + src/main.ts + App.vue     │   │   │
│  │  │  - injects dark mode CSS/JS via transformIndexHtml│   │   │
│  │  │  - HMR when files change                         │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  │                                                          │   │
│  │  Filesystem:                                             │   │
│  │    index.html      (with console-interceptor injected)   │   │
│  │    package.json                                          │   │
│  │    vite.config.ts                                        │   │
│  │    src/main.ts      (birpc RPC bridge)                   │   │
│  │    src/App.vue      (user-edited code)                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

## Hot Reload for Content Templates

When a `.template/files/` file changes in development:

1. The `template-loader` module's file watcher detects the change
2. It sends a Vite HMR event `template:update` with `{ filename, content }` to the client
3. The playground store handles this and writes the updated content to the WebContainer's virtual filesystem
4. Since Vite is running inside the WebContainer, the preview auto-updates via Vite HMR
5. The module also invalidates Vite's module graph and touches the sibling `.md` file to bust Nuxt Content cache
