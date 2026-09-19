# Agent Instructions for amoxtli-vue-2

## Project overview

Nuxt 4 app for learning Vue. Runs interactive code playgrounds via almostnode (local WebContainer fork at `../oss/almostnode`).

## Key architecture

- WebContainer boots in `stores/playground.ts`, mounts files, runs Vite dev server inside the container
- Preview rendered in iframe via `PanelPreviewClient.client.vue`
- Service worker (`public/__sw__.js`) proxies HTTP from iframe to container virtual servers
- Communication via birpc over postMessage (color mode, console, RPC)
- Templates in `templates/` define base project files (vue, html, vue-sass)

## Debugging container issues

Set `window.__almostnodeDebug = true` in browser console before mount.
See `docs/preview-system.md` -> "Debugging the Container" section for full probe list.

For the challenge validation flow, set `window.__challengeDebug = true` in the browser
console to enable the `[challenge-debug]` logs. See `docs/preview-system.md` ->
"Debugging the challenge flow".

## Challenge authoring

Checkable challenges are authored once in a shared bank at `challenges/<id>/`
(`suite.ts` + per-locale `en.yaml`/`es_mx.yaml`) and referenced by lesson via
`validation: { challenge: '<id>' }`; the mounted suite is generated at build
time. See `docs/challenge-banking.md` for the full authoring model, and
`docs/preview-system.md` -> "Challenge Validation Suites" for how suites
execute in the preview.

## @nuxtjs/mdc twoslash newline patch

The twoslash blocks in lessons run through `@nuxtjs/mdc`'s shiki highlighter.
Upstream `@nuxtjs/mdc@0.22.2` has a bug: its `mdc:newline` transformer appends
"\n" into the last token of each line (`text.value += "\n"`), so any twoslash
hover/query target that ends a line (e.g. DOM types like `HTMLInputElement`)
fails with `ShikiTwoslashError: Cannot find tokens for node ...` and crashes
the whole lesson. This repo fixes it via
`patches/@nuxtjs__mdc@0.22.2.patch` (registered as a `patchedDependencies`
entry in `pnpm-workspace.yaml`).

When upgrading `@nuxtjs/mdc` (transitively via `@nuxt/content`):

- If `pnpm install` warns that the patched version no longer matches (or the
  patch fails to apply), inspect
  `node_modules/.pnpm/@nuxtjs+mdc@*/node_modules/@nuxtjs/mdc/dist/runtime/highlighter/shiki.js`.
- If upstream still does `text.value += "\n"` on the last token: re-generate
  the patch with `pnpm patch @nuxtjs/mdc@<newversion>` (fix: push a
  line-level `{ type: "text", value: "\n" }` node instead) and `pnpm patch-commit`.
- If upstream fixed it: delete the patch file and remove the
  `patchedDependencies` entry from `pnpm-workspace.yaml`.

## Commands

- `pnpm dev` -- start dev server
- `npm run lint` -- eslint
- `npm run typecheck` -- nuxt typecheck (has pre-existing errors in shiki/vite types, ignore those)
