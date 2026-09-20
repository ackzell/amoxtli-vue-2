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

## Committing (conventional commits)

All commits must follow the conventional commits format: `<type>(<scope>): <subject>`.

Use the opencode `/commit` command to stage and commit the work produced in the
current session (it applies the rules below and asks when in doubt).

### Scopes

The scope list below mirrors `conventionalCommits.scopes` in
`.vscode/settings.json` (used by the VSCode "Conventional Commits" extension).
Keep both in sync when changing it.

| scope | use for | code areas |
| --- | --- | --- |
| `release` | version bumps only; produced by `pnpm tag` / `tag:minor` / `tag:major` (commit-and-tag-version), never hand-written | CHANGELOG.md, `package.json` version |
| `deps` | add/upgrade/remove dependencies, workspace catalog, vendored almostnode, dependency patches | `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `vendor/`, `patches/` |
| `helper-components` | MDC/code components rendered *inside lesson markdown* and their support machinery | `components/content/`, `shiki/`, `mdc.config.ts`, lesson CSS in `styles/` |
| `content` | lesson authoring, translations, page structures | `content/`, `i18n/`, `structures/`, `content.config.ts` |
| `ui` | app chrome/shell (nav, theme toggle, dialogs, palette, layout) | `components/ui/`, `TheNav`, `ColorSchemeToggle`, `CommandPalette`, `store/ui.ts` |
| `a11y` | broad cross-cutting accessibility passes only (semantics, focus, keyboard nav, ARIA). Per-component a11y fixes use that component's own scope | any |
| `templates` | base projects mounted into the playground container | `templates/`, `modules/template-loader.ts` |
| `challenge` | challenge bank, validation suites, retake flow, Challenge blocks | `challenges/`, `useChallenge*`, `lib/challenge-*` |
| `quiz` | quiz bank, block, grading | `quizzes/`, `useQuiz*`, `lib/quiz-*` |
| `invites` | invite lifecycle | `invites.yaml`, `scripts/*invite*` |
| `playground` | container boot, editor/preview/console/terminal, service worker | `stores/playground.ts`, `stores/preview.ts`, `monaco/`, `public/__sw__.js`, `Panel*` |
| `changelog` | in-app changelog dialog | `ChangelogDialog.vue`, `lib/changelog/` |
| `content-cli` | content authoring CLI | `packages/create-content/` |
| `dev` | build/tooling/dev-experience (build config, lint, tsconfig, scripts) | `nuxt.config.ts`, `eslint.config.js`, `tsconfig.json`, `scripts/`, `.vscode/` |
| `ci` | CI and deploy config | `.github/workflows/`, `wrangler.toml` |

### Types

- `feat` / `fix` -- user-visible behavior changes
- `refactor` -- internal restructuring with no behavior change
- `chore` -- build, tooling, housekeeping
- `docs`, `test`, `perf`, `revert` -- self-explanatory

### Rules

- Commit **only the work produced in the current session**. Stage explicit
  paths (`git add <path>`), never `git add -A`.
- If a change genuinely spans multiple scopes (e.g. a helper component plus the
  lesson content using it), split it into one commit per scope -- but confirm
  the split with the user first.
- When the right type or scope is not obvious, ask for clarification instead
  of guessing.
- Subject: imperative mood, lowercase, `<= ~72` chars, no trailing period. Add
  a body (`-m`) explaining the "why" when non-obvious.
- `deps` changes carry lockfile, catalog, and patch updates together with the
  dependency change.
- Never commit secrets. `.env*`, `invites-batch.json`, and
  `invites-in-remote.json` are gitignored.
- Do not push unless asked.

## Commands

- `pnpm dev` -- start dev server
- `npm run lint` -- eslint
- `npm run typecheck` -- nuxt typecheck (has pre-existing errors in shiki/vite types, ignore those)
