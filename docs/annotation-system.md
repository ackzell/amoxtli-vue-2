# Code Annotation System

The annotation system lets you attach rich metadata to fenced code blocks —
line annotations, pattern highlights, collapse ranges, labels, filenames, and
line-number toggles.

All annotation syntax lives on the **opening fence line**, after the language
identifier.

````markdown
```vue {"This is an annotation":3-5} /pattern/ collapse={10-20} title="App.vue"

```
````

---

## Annotation Types

### 1. Line annotations — `{"text":lines}`

Highlights a range of lines and attaches a text label to them.

````markdown
```ts {"The returned values will be available in the template":9-12}

```
````

`````

- `text` — anything inside `"..."` (no `"` characters allowed)
- `lines` — comma-separated line numbers and/or ranges (`1`, `1-3`, `1-3,5,7-9`)

Rendered as a highlighted line background + a text row (above or beside the
first annotated line, configurable in `app.config.ts`).

### 2. Bare labels — `{"text"}`

A label that is decoded by the system. Currently stored in `ParsedEcInfo.labels`
but not rendered visually — reserved for future use.

````markdown
```ts {"setup()"}

`````

`````

### 3. Text markers — `"text"` and `/pattern/`

Highlights text inside a code block. There are two forms, matching
[Expressive Code](https://expressive-code.com/) semantics:

- **`"text"` / `'text'`** — a **plaintext** match. `text` is matched literally,
  so `"console.log('hi')"` highlights that exact substring, parentheses and all.
  Use this for literal text (including `.`, `(`, `)`, `/`, and URLs).
- **`/pattern/`** — a **JavaScript regex** match (without flags). Use this for
  ranges/variants, e.g. `/v-if="[^"]+"/`.

````markdown
```ts "setup()" /:class="entry.sender"/

`````

``````

- A marker must be preceded by whitespace, so `/` in `file:/path` and quotes in
  `title="App.vue"` aren't mistaken for markers.
- Use single quotes when the literal contains a double quote: `'type="module"'`.
- Escapes inside quotes: `\"`, `\'`, and `\\` are unescaped before matching.
- Either form accepts an optional trailing line range: `"setup()" 5-8` or
  `/pattern/ 5-8` restricts the highlight to those lines.

Rendered with `.ec-highlight` class (a colored border/background around the
matching text).

> **Prettier and regex escapes.** Prettier's markdown formatter strips
> backslashes before ASCII punctuation (`\.` `\(` `\)` `\/` `\\`) on fence
> lines, but keeps `\d`, `\s`, `\b`, `\w`. A literal-punctuation regex such as
> `/\.me\b/` therefore loses its escapes the next time the file is formatted.
> Prefer a quoted plaintext marker (`".me"`), or a character class
> (`/[.]me\b/`); real regex classes and word boundaries survive fine.

### 4. Collapse ranges — `collapse={...}`

Collapses a range of lines into a toggleable widget.

`````markdown
````vue title="App.vue"
```ts file:/src/utils.ts
```solution:/components/Answer.vue
```vue [MyComponent.vue]
``````

- `file:/path` — resolves to `.template/files/path` (the starter code for a lesson)
- `solution:/path` — resolves to `.template/solutions/path` (the completed/solution code)
- `title="..."` — explicit filename header
- `[filename]` — fallback metadata syntax

Rendered as a filename header above the code block. The filename also determines
icon and language when no language is explicitly set.

`````markdown
````vue title="App.vue"
```ts file:/src/utils.ts
```vue [MyComponent.vue]
````
`````

```

```

### 6. Line numbers — `showLineNumbers=false`

Hides line numbers for a specific block (default is `true`).

````markdown
```ts showLineNumbers=false

```
````

### 7. Inline diffs — `diff`

Marks a block as an inline diff, matching
[Expressive Code's diff-like syntax](https://expressive-code.com/key-features/text-markers/#using-diff-like-syntax):
prefix changed lines with `+` (inserted) or `-` (deleted) in the first column.

````markdown
```vue-diff
<script setup>
let name = ''
- function updateName(event) {
+ function updateName(event: Event) {
+   const input = event.target as HTMLInputElement
-   if (event.target.value) {
+   if (input.value) {
  }
}
</script>
```
````

- The opening fence language is `vue-diff` (or `ts-diff`, `js-diff`, … — any
  `{lang}-diff` where `{lang}` is a normal Shiki language name). The `beforeParse`
  hook rewrites it to the canonical `{lang} diff` form before MDC/Shiki see it,
  so the block keeps its syntax highlighting (here: Vue) and the bare `diff`
  meta token marks it as a diff. **Use the `-diff` suffix form, not a separate
  `diff` word**: ESLint's markdown processor parses ` ```vue ` fences as Vue SFCs,
  and a `+`/`-` prefixed body would be invalid code → "Parsing error: Expression
  expected". An unknown language like `vue-diff` is pass-through'd by ESLint, so
  the block is simply not linted (a diff view isn't a runnable program anyway).
- `+`/`-` must be the very first character of the line. The marker plus **one
  optional alignment space** after it are stripped from the rendered code;
  real indentation is preserved. Use `-   if (...)` → renders `  if (...)`.
- Unchanged lines are left as-is; they keep their line number.
- Changed lines get a green (inserted) or red (deleted) background + left
  accent bar, and the gutter shows a `+` / `−` indicator in place of the line
  number.
- The copy button copies the raw block text, so the copied output still
  contains the `+`/`-` markers.

> **Limitations.** The feature is client-side DOM work (like annotations), so
> the markers briefly appear in SSR output until the mount pass strips them.
> A block cannot be both `diff` and `twoslash` or `live` — a `+`/`-` prefixed
> line would fail to parse as code in those systems. Keep the twoslash/hover
> exploration in separate, undiffed blocks.

### 8. Side-by-side diffs — `::diff-view`

Inline diffs (§7) show additions/deletions in place, one line at a time.
`::diff-view` complements them with a full **before → after** comparison: two
complete fenced blocks are rendered side-by-side in a split view. Use it when
the change is structural (new `<script setup>` block, differently shaped
template) rather than a couple of lines.

The container wraps **two fenced blocks** — first = before, second = after —
in the MagicMove authoring style (`::magic-move`):

````markdown
::diff-view{lang="vue" before="Without the listener" after="With @change"}

```vue
<script setup>
const name = ''
</script>

<template>
  <input type="text" placeholder="Your name">
</template>
```

```vue
<script setup>
let name = ''
function updateName(event) {
  name = event.target.value
}
</script>

<template>
  <input type="text" placeholder="Your name" @change="updateName">
</template>
```

::
````

| Prop             | Meaning                                                               | Default                                   |
| ---------------- | --------------------------------------------------------------------- | ----------------------------------------- |
| `lang`           | Language of both blocks; mapped to a shiki grammar                    | `plaintext`                               |
| `before`/`after` | Labels for the left/right pane headers                                | i18n `diff-view.before`/`diff-view.after` |
| `max-height`     | Max pane height before vertical scrolling                             | `28rem`                                   |
| `output-format`  | Force display mode (`side-by-side` or `line-by-line`)                 | auto                                      |

Behavior notes:

- Both fences are **real, valid code** — no `+`/`-` markers, no annotation
  syntax. ESLint parses them as plain Vue SFCs (so they must be lint-clean,
  which an annotation-fence doesn't need to be), and they get normal Shiki
  highlighting inside the hidden slot before the component reads their text.
- The component (`components/content/DiffView.client.vue`) reads the two
  blocks' text from the slot (same pattern as `MagicMove.client.vue`) and
  feeds them into the handrolled `DiffCode` component
  (`components/content/DiffCode.vue`), which diffs them with jsdiff
  (`diffLines` + `diffWords`) and tokenizes both panes with **Shiki** using the
  site's themes (`amoxtli-light`/`vesper`).
- One of the wins over the previous highlight.js-based implementation:
  `lang="vue"`/`svelte`/`scss` are first-class shiki grammars, so `<script setup>`
  bodies colorize in the panes without a language-mapping hack. Added/deleted
  words get a `positive`/`negative` tint on top of the line-level background.
- The diff is **client-only**: shiki themes/langs load on mount, so the block
  shows a loading placeholder until then. The theme tracks `colorMode`
  (`vesper`/`amoxtli-light`), with the panes restyled to the site's design
  tokens (`bgr`, `positive`/`negative` tints).
- On narrow screens (below `767px`) the view automatically falls back to the
  line-by-line (`line-by-line`) format to avoid a cramped split; pass
  `output-format="side-by-side"` to force it.
- Nothing here runs through the `beforeParse` encoding pipeline — the container
  line and its fences use syntax the hook already leaves alone.

---

## How It Works (Pipeline)

The annotation system has three stages:

### Stage 1: Encoding (`nuxt.config.ts` — `content:file:beforeParse` hook)

Before MDC or Shiki sees the markdown, the `beforeParse` hook scans every
fenced code block opening line and encodes annotation tokens so they don't
interfere with Shiki or the MDC parser.

**Encodings produced:**

| Source syntax        | Encoded token              |
| -------------------- | -------------------------- |
| `{"text":lines}`     | `__EANN_<hex>_L_<lines>__` |
| `{"text"}`           | `__ELBL_<hex>__`           |
| `"text"` / `/regex/` | `__ECPT_<hex>__`           |
| `collapse={...}`     | `collapse=__ECOL_<val>__`  |

The `diff` flag and `showLineNumbers=false` are bare words with no quotes,
braces, or slashes, so they pass through MDC meta untouched and need no
encoding. (`vue-diff` authoring is normalized to `vue diff` here first — see
section 7.)

The `hex` portion is the UTF-8 hex-encoded text. For example, `hello` → `68656c6c6f`.

Tokens are decoded back to their original form later. This encoding prevents
Shiki from misinterpreting `{ }`, `[ ]`, `/`, and other special characters.

The hook also:

- Rewrites `{lang}-diff` fence languages to `{lang} diff`
- Infers language from `file:` / `solution:` extension if no language is given
- Inlines content from `.template/files/` (for `file:`) or `.template/solutions/` (for `solution:`) paths

### Stage 2: Decoding (`composables/useEcParser.ts`)

The `parseEcInfo(input)` function is the central decoder. It receives the
combined `"<language> <meta>"` string from the fence line and returns a
`ParsedEcInfo` object:

```ts
interface ParsedEcInfo {
  file: string
  title: string
  showLineNumbers: boolean
  collapseRanges: CollapseRange[]
  collapseLines: number[]
  annotations: Annotation[]
  highlights: Highlight[]
  labels: string[]
  diff: boolean
}
```

Decoding order:

1. Strip `__ELBL_` tokens → populate `labels[]`
2. Strip `__EANN_` tokens → populate `annotations[]` (with decoded text + line ranges)
3. Parse raw `{"text":lines}` fallback (for when encoding didn't run)
4. Strip `file:` and `title="..."` → populate `file`, `title`
5. Strip the `diff` flag token → set `diff: true`
6. Strip `collapse=...` → populate `collapseRanges[]`
7. Strip `showLineNumbers=...`
8. Decode `__ECPT_` tokens back to `"text"` / `/regex/` strings
9. Extract quoted `"text" [lines]` markers → `highlights[]` (`plain: true`)
10. Parse remaining `/regex/ [lines]` → populate `highlights[]`

Helper functions:

- `parseRanges(input)` — converts `"1-3,5,7-9"` to `[1,2,3,5,7,8,9]`
- `parseCollapseRanges(input)` — converts to `[{start, end}]` objects

### Stage 3a: SSR — Shiki transformers (`mdc.config.ts`)

Two transformers run during Shiki's server-side rendering:

**`ec-highlight`** — handles text-marker (`"text"` / `/regex/`) highlighting:

- `preprocess(code, options)`: parses fence meta, creates Shiki `decorations[]`
  entries with `{line, character}` offsets for each literal/regex match, setting
  `class: 'ec-highlight'`

**`ec-fix-popup-code-lang`** — overrides `this.codeToHast` to use `typescript`
lang for Vue SFC twoslash popup content.

### Stage 3b: Client-side — DOM decorations (`composables/useEcDecorations.ts`)

On mount, `ProsePre.vue` calls `applyEcDecorations()` which manipulates the
rendered `<code>` element's DOM directly:

**Collapse logic:**

1. For each `collapseRange`, creates a `.ec-collapse-range` container div
2. Moves the target `.line` elements into the container
3. Inserts a `ProsePreCollapseWidget` Vue component rendered into a
   `.ec-collapse-widget` span
4. Toggle expands/collapses by adding/removing `.ec-collapsed` class

**Annotation logic:**

1. For each `annotation` range, adds `.ec-annotated` to each `.line`
2. Wraps line content (excluding twoslash hover elements) in
   `.ec-annotated-content` span
3. Depending on `app.config.ts` annotation position:
   - `'row'` (default): inserts a `.ec-annotation-row` div with the annotation
     text, placed before or after the first annotated line
   - `'inline'`: adds `.ec-annotation-inline` class and sets `data-ec-note`
     attribute, text appears as `::after` pseudo-element on the right

**Configuration** (`app.config.ts`):

```ts
codeSnippets: {
  annotation: {
    position: 'row',       // 'row' | 'inline'
    rowPlacement: 'before', // 'before' | 'after' | 'top' | 'bottom'
  },
}
```

### Cleanup

`cleanupDecorations(codeEl)` undoes all DOM decorations before re-applying:
removes `.ec-collapse-range` containers (unwrapping children), removes
`.ec-collapse-widget` / `.ec-annotation-row` elements (unmounting Vue
components via `render(null, el)`), removes classes and attributes from `.line`
elements, and replaces `<mark.ec-highlight>` with text nodes.

---

## Component Architecture

### `ProsePre.vue` (the main code block renderer)

Receives these props from Nuxt Content:

- `code` — raw code text
- `language` — language identifier
- `filename` — inferred filename
- `meta` — everything after the language on the fence line

Flow:

1. Computes `ecInfo = language + ' ' + meta`
2. Calls `parseEcInfo(ecInfo)` → `ParsedEcInfo`
3. Derives `language`, `inferredFilename`, `iconClass`, `showLineNumbers` from
   the parsed info
4. Renders `ProsePreHeader` (if filename present), toolbar with
   `ProsePreCollapseAllButton`, font-size buttons, copy button
5. Renders `<pre><slot /></pre>` with `data-ec-meta` attribute
6. On mount: calls `applyEcDecorations()` on `nextTick`
7. Watches `[code, meta, language]` → calls `resetDecorations()`

### Magic-move (`MagicMove.client.vue`)

The `::magic-move` MDC component **does not support annotations**. It reads
only the raw `.textContent` from each `<pre><code>` block inside its slot,
losing all annotation metadata. The re-highlighting uses `@shikijs/magic-move`'s
`codeToKeyedTokens()` which doesn't accept Shiki decorations.

To support annotations in magic-move, the data flow would need to:

1. Read the `data-ec-meta` attribute (stored on `<pre>` by `ProsePre.vue` via
   `:data-ec-meta="ecInfo"`)
2. Decode with `parseEcInfo(meta)`
3. Convert annotations/highlights to Shiki `decorations[]`
4. Pre-tokenize each step with `highlighter.codeToTokens(code, {lang, theme,
decorations})`
5. Render with `ShikiMagicMovePrecompiled` instead of `ShikiMagicMove`

---

## Related Files

| File                                                    | Role                                                    |
| ------------------------------------------------------- | ------------------------------------------------------- |
| `nuxt.config.ts` (lines 181-293)                        | Encodes annotation tokens in `content:file:beforeParse` |
| `mdc.config.ts`                                         | Shiki transformers for pattern highlighting             |
| `composables/useEcParser.ts`                            | Decodes tokens into `ParsedEcInfo`                      |
| `composables/useEcDecorations.ts`                       | Applies DOM decorations (collapse, annotations)         |
| `components/content/ProsePre.vue`                       | Main code block component with full annotation support  |
| `components/content/ProsePreHeader.vue`                 | Filename header with file icon                          |
| `components/content/ProsePreCollapseWidget.vue`         | Collapse toggle widget                                  |
| `components/content/ProsePreCollapseAllButton.vue`      | Expand/collapse all button                              |
| `components/content/ProsePreCopyButton.vue`             | Animated copy button                                    |
| `components/content/ProsePreIncreaseFontSizeButton.vue` | Font size +                                             |
| `components/content/ProsePreDecreaseFontSizeButton.vue` | Font size -                                             |
| `components/content/MagicMove.client.vue`               | Magic-move component (no annotation support)            |
| `app.config.ts`                                         | Annotation position/behavior configuration              |
| `styles/base.css`                                       | Defines `--amv-highlight` CSS variable (light/dark)     |

```

```
