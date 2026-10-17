# Amoxtli Vue — Feature Overview

Amoxtli Vue (*amoxtli* = "book" in Nahuatl) is a multimedia, hands-on way to
learn Vue. It is an independent fork of
[learn.nuxt.com](https://learn.nuxt.com) and combines three pillars, so that
people with different learning styles can all find a way in:

> **Not affiliated with the Nuxt or Vue teams.** Amoxtli Vue is a community
> project. It is not endorsed by, sponsored by, or officially connected to the
> Nuxt team, NuxtLabs, or the Vue.js team. "Nuxt" and "Vue" are referenced only
> to describe the technologies it teaches and to credit its upstream project.

1. **Interactive lessons** — written content enriched with interactive
   components you can poke at, right inside the page.
2. **Video** — talks, explanations, or purpose-made recordings embedded in the
   lessons.
3. **The Playground** — an in-browser environment that mimics a desktop
   development setup as closely as possible.

Lessons are available in English and Spanish (`en`, `es_mx`), with light/dark
themes and keyboard-friendly navigation throughout.

> Audience for this document: contributors, and anyone producing promotional or
> demo material (for example a showcase video). Technical details live in the
> linked docs.

---

## 1. Interactive lesson components

Lessons are Markdown (Nuxt Content / MDC) with embedded components. They turn
reading into doing without leaving the page.

### Live code

| Component | What it does | Docs |
| --- | --- | --- |
| **VueLive** (` ```vue live `) | An editable Vue SFC with a Monaco editor, live preview and optional console, compiled in the browser. Reset button included. | [vue-live.md](vue-live.md) |
| **HtmlLive** (` ```html live `) | Same experience for raw HTML/JS snippets. | [html-live.md](html-live.md) |

### Reading code

| Component | What it does | Docs |
| --- | --- | --- |
| **MagicMove** (`::magic-move`) | Step-by-step code walkthrough: code morphs between steps, each with a label. Keyboard accessible. | — |
| **DiffView** (`::diff-view`) | Side-by-side (or line-by-line on narrow screens) before/after comparison. | — |
| **DiffCode** | Word-level diff rendering used by DiffView. | — |
| **Code annotations** | Fenced blocks can carry line annotations, highlights, collapsible ranges, titles and labels. Code blocks also have copy, font-size and collapse-all controls. | [annotation-system.md](annotation-system.md) |
| **Twoslash tooltips** | Hover a token in a code sample to see its real TypeScript type. | — |
| **Tooltips** (`:tooltip-trigger` / `::tooltip-content`) | Inline glossary-style explanations in prose. | — |

### Practice and feedback

| Component | What it does | Docs |
| --- | --- | --- |
| **Challenge** (`::challenge`) | A task in the Playground whose result is automatically checked by a validation suite running in the preview. Shows pass/fail per check. Challenges are authored once in a shared bank and referenced by lesson. | [challenge-banking.md](challenge-banking.md), [preview-system.md](preview-system.md) |
| **ButtonShowSolution** | Peek at the solution, then restore your own code exactly as you left it. | [button-show-solution.md](button-show-solution.md) |
| **Quiz** | Graded questions with shuffled order and persisted progress, from a shared quiz bank. | [preview-system.md](preview-system.md) ("Quizzes") |

### Callouts and navigation

Callouts (`::tip`, `::info`, `::warn`, `::note`, `::success`), content cards
for lesson navigation, a docs sidebar, and a **command palette** for quick
jumping and actions.

---

## 2. Video

The `YouTubePlayer` component embeds a YouTube video in a lesson
(`videoId`, `title`, optional `duration`). It uses the privacy-friendly
`youtube-nocookie.com` domain and, in browsers without `credentialless` iframe
support, degrades to a link card instead of embedding.

Intended uses (from the README): interesting community talks, individual
concepts explained, and content made specifically for this project such as
recorded sessions or a video course.

---

## 3. The Playground

The Playground is a full development environment running **entirely in the
browser** — no install, no server round-trip for your code. It is built on a
WebContainer (our local fork of `almostnode`) that boots a virtual Node.js
machine, mounts a project template and runs a real Vite dev server inside it.

What the user gets:

- **Editor** — Monaco (the VS Code editor) with syntax highlighting and
  multi-file support, plus a **file tree** for creating and organising files.
- **Live preview** — the running app in an iframe, with hot reload as you type.
  A service worker proxies the iframe's requests to the in-browser server.
- **Terminal** — an interactive shell (`jsh`) inside the container.
- **Console** — output from the running app is captured and shown, with
  host-page noise filtered out.
- **Project templates** — plain HTML, Vue, and Vue + Sass starting points.
- **Snapshots** — save and restore versions of your work from a sidebar.
- **Guided mode** — lessons drive the Playground: loading starter code,
  showing solutions, and running challenge checks.
- **Free exploration** — also usable standalone, to experiment without a lesson.
- **Responsive layout** — resizable panes on desktop, a panel toggle on mobile.
- **Color-mode sync** — the preview follows the app's light/dark theme.

Architecture and debugging: [preview-system.md](preview-system.md).

---

## 4. Learning path

Current lesson tracks (under `content/en/`): Intro (context and history) →
Basics (installing, CDN, ESM, import maps) → The Playground (SFCs,
pre-processors, `<script setup>`) → Rendering on the page (interpolation,
directives, conditionals, lists, binding) → Interactivity (input, `v-on`,
modifiers, Composition vs Options API) → Reactivity (`ref`, `reactive`,
`computed`, `nextTick`) → Styling (dynamic classes, challenge).

---

## 5. Other platform features

- **Invites** — access is managed via an invite lifecycle ([invite-system.md](invite-system.md)).
- **Changelog dialog** and **feedback widget** in the app.
- **Content authoring CLI** (`packages/create-content`) for scaffolding lessons
  and challenges.
- Deployed to Cloudflare Pages.

---

## Suggested storyline for a demo video

1. Hook: "A book of Vue you can run." Show a lesson page.
2. Interactive components: edit a VueLive block, step through a MagicMove,
   hover a Twoslash tooltip, view a DiffView.
3. Video: a lesson with an embedded video.
4. Playground: boot, edit a file, watch live preview, run a terminal command,
   take a snapshot.
5. Challenge: fail a check, fix the code, see it pass.
6. Close: dark mode, Spanish locale, command palette.
