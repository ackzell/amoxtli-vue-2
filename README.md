<p align="center">
  <a href="https://youtu.be/kIEMJui34_4">
    <img src="https://img.youtube.com/vi/kIEMJui34_4/maxresdefault.jpg" width="720"
         alt="Amoxtli Vue: a book of Vue you can run">
  </a>
</p>

<p align="center"><em>▶ <a href="https://youtu.be/kIEMJui34_4">107-second launch film</a></em></p>

# Amoxtli Vue

> **[ah-MOSH-tlee](https://nahuatl.wired-humanities.org/content/amoxtli)** in Nahuatl means book. So this is the book of Vue.

A hands-on, multimedia way to learn Vue: lessons you can read, live code you can
edit, and a real development environment that runs entirely in your browser.

Amoxtli Vue is an independent fork of [learn.nuxt.com](https://learn.nuxt.com),
reimagined as a multimedia platform for learning Vue.

> [!IMPORTANT]
> Amoxtli Vue is a community project and is **not affiliated with, endorsed by, or sponsored by** the Nuxt team, NuxtLabs, or the Vue.js team. "Nuxt" and "Vue" appear here only to describe the technologies it teaches and to credit the project it forked from.

This is a spiritual successor to [notes-on-vue](https://notes-on-vue.ackzell.dev).
The goal is a multimedia, interactive experience that caters to different
learning styles, with emphasis on the hands-on aspect the original site attempted
via CodePen embeds, but which always lacked the sense of a _real_ environment to
try Vue in.

## Written by a human

Kind of odd that I need to clarify this, but the lessons and the example code here are written by a person. Keeping it that way is a
commitment. AI assistance with development and some of the
technical work is unavoidable in this era, and this project uses it there, but the
teaching itself is never delegated. The point of a book is the connection between
an author and a reader, and that is something no machine-generated content can
achieve.

You can actually check out some livestreams I have for the project and that are part of [this playlist](https://www.youtube.com/watch?v=_eyFYkbtl40&list=PLmJs3lfUmCdTQDpZop2BC1EJ5emEpTBPn) on YouTube.

## What's in it

Three pillars, so people with different learning styles all find a way in:

1. **Interactive lessons**: written content enriched with components you can poke
   at, right in the page. Editable live code (`VueLive`, `HtmlLive`), step-by-step
   code walkthroughs (`MagicMove`), before/after diffs (`DiffView`), real
   TypeScript type hovers (twoslash), inline tooltips and callouts.
2. **Video**: talks, explanations, or purpose-made recordings embedded in lessons
   via a privacy-friendly `YouTubePlayer`.
3. **The Playground**: an in-browser environment that mimics a desktop
   development setup as closely as possible.

Lessons are available in **English** and **Spanish** (`es_mx`), with light/dark
themes and keyboard-friendly navigation throughout.

Two further pieces make it a course rather than a collection of pages:

- **Challenges**: a task in the Playground whose result is checked automatically by
  a validation suite running inside the preview, with pass/fail per check.
- **Quizzes**: graded questions, shuffled and with persisted progress.

Both are authored once in a shared bank and referenced by lesson, so the same
challenge or quiz can back multiple pages.

→ **[docs/features.md](docs/features.md)** has the full inventory with links to
per-feature documentation.

## The Playground

The Playground is a full development environment running **entirely in the
browser**, with no install and no server round-trip for your code. It is built on
a WebContainer (our local fork of [`almostnode`](https://github.com/ackzell/almostnode))
that boots a virtual Node.js machine, mounts a project template, and runs a real
Vite dev server inside it.

- **Editor**: Monaco (the VS Code editor) with multi-file support and a file tree
  for creating and organising files.
- **Live preview**: the running app in an iframe, with hot reload as you type. A
  service worker proxies the iframe's requests to the in-browser server.
- **Terminal**: an interactive shell inside the container.
- **Console**: the running app's output, with host-page noise filtered out.
- **Templates**: plain HTML, Vue, and Vue + Sass starting points.
- **Snapshots**: save and restore versions of your work from a sidebar.
- **Guided mode**: lessons drive the Playground, loading starter code, showing
  solutions, and running challenge checks.
- **Free exploration**: also usable standalone, to experiment without a lesson.

Architecture and debugging: [docs/preview-system.md](docs/preview-system.md).

## Learning path

Under `content/<locale>/`, currently:

**Intro** (context and history) → **Basics** (installing, CDN, ESM, import maps) →
**The Playground** (SFCs, pre-processors, `<script setup>`) → **Rendering on the
page** (interpolation, directives, conditionals, lists, binding) →
**Interactivity** (input, `v-on`, modifiers, Composition vs Options API) →
**Reactivity** (`ref`, `reactive`, `computed`, `nextTick`) → **Styling** (dynamic
classes, challenge).

## Development

Requires [Node.js v22+](https://nodejs.org/) and [pnpm](https://pnpm.io/).

```bash
pnpm install
pnpm dev
```

Server runs at [http://localhost:3000](http://localhost:3000).

### Working on the Playground

The container is a separate checkout vendored in as a frozen tarball
(`vendor/almostnode-*.tgz`). To change it, have the sibling repository at
`../oss/almostnode` and rebuild it into this one:

```bash
pnpm run sync:almostnode
```

That builds the library, repacks the tarball into `vendor/`, and reinstalls it.

### Checks

```bash
pnpm test        # vitest
npm run lint     # eslint
npm run typecheck
pnpm content     # scaffolding CLI for lessons and challenges
```

`typecheck` currently reports pre-existing errors in the shiki and vite types;
those are not caused by your changes.

## Repository map

| Path                       | What's in it                                          |
| -------------------------- | ----------------------------------------------------- |
| `content/`                 | Lessons, per locale (`en`, `es_mx`)                   |
| `challenges/`              | Shared challenge bank (`suite.ts` + per-locale YAML)  |
| `quizzes/`                 | Shared quiz bank                                      |
| `templates/`               | Base projects mounted into the Playground container   |
| `components/content/`      | MDC components rendered inside lesson markdown        |
| `stores/`                  | Playground, preview, guide, and UI state              |
| `packages/create-content/` | CLI for scaffolding lessons and challenges            |
| `docs/`                    | Contributor and architecture documentation            |
| `public/__sw__.js`         | Service worker proxying the preview iframe's requests |

## Deploy

Deployed to Cloudflare Pages via GitHub Actions on every push. `wrangler.toml`
wires up the bindings the app needs: KV namespaces for the invite lifecycle
(`invites`) and the feedback widget (`feedback`).

Lesson progress, snapshots, and playground sessions are stored client-side in
IndexedDB via Dexie (`db/`), not on the server.

## Credits

The launch film's music is licensed [CC-BY 3.0](https://creativecommons.org/licenses/by/3.0/)
and requires attribution:

> **"Fly"** by [Alexandr Zhelanov](https://soundcloud.com/alexandr-zhelanov),
> licensed CC-BY 3.0, via [OpenGameArt](https://opengameart.org/content/techno-space).
