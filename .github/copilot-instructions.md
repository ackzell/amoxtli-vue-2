# Copilot instructions for learn.nuxt.com

## Big picture
- Nuxt 3 app that serves an interactive tutorial + playground; routes are content-driven and mount a WebContainer-backed file system for each guide.
- Route handling lives in `pages/[...slug].vue`, which loads each guide’s `.template/index.ts` metadata and passes it to the guide store.
- `stores/guide.ts` orchestrates guide state (features, solutions, starting file/url) and calls `stores/playground.ts` to mount/update files.

## Playground architecture (WebContainers)
- `stores/playground.ts` boots the WebContainer, builds `VirtualFile` objects, mounts via `filesToWebContainerFs()` and starts processes (`pnpm install`, `pnpm dev`, `jsh`).
- Dev server URL is discovered from WebContainer `server-ready` events; the main port is 5173 (`DEV_SERVER_PORT`).
- Console interception is injected into HTML files before mounting (`templates/console-interceptor.ts`).
- Virtual file behavior is encapsulated in `structures/VirtualFile.ts`; avoid writing directly to WebContainer FS elsewhere.

## Templates and content
- Guides are under `content/<locale>/**` and each guide folder can include `.template/` with:
  - `.template/index.ts` for metadata (features, starting file/url, ignored files).
  - `.template/files/**` for guide files, merged with `templates/basic`.
  - `.template/solutions/**` for optional solutions.
- `modules/template-loader.ts` injects `.template/files` and `.template/solutions` into the meta at build time.
- Content collections are configured in `content.config.ts` and exclude `.template/**` from the rendered content.

## Project-specific conventions
- A custom NuxtLink is swapped in via `modules/nuxt-link.ts` (component override).
- UI layout state is cookie-persisted in `stores/ui.ts` (panel sizing + toggles).

## Key workflows
- Dev: `pnpm install` then `pnpm dev` (Node.js v22+, pnpm required).
- WebContainer templates must use `pnpm@8.15.6` and Nuxt `3.15.4` due to WebContainer constraints (see `templates/README.md`).

## Integration points
- `@webcontainer/api` is central to the playground runtime (boot, mount, spawn). 
- Monaco/Volar integration lives in `monaco/` and is wired into the editor panels; prefer existing helpers there when changing editor behavior.
