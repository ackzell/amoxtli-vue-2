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

### 3. Pattern highlights — `/pattern/`

Highlights text that matches a regex pattern.

````markdown
```ts /setup()/ /:class="entry.sender"/

`````

``````

- The pattern is a JavaScript regex (without flags)
- Can be combined with line filters: `/pattern/ 5-8` highlights only on lines 5-8
- Requires leading whitespace (so `/` in `file:/path` isn't mistaken for a pattern)

Rendered with `.ec-highlight` class (a colored border/background around the
matching text).

### 4. Collapse ranges — `collapse={...}`

Collapses a range of lines into a toggleable widget.

`````markdown
```vue collapse={24-30, 49-82}

```

``````

Rendered as a bordered, collapsible section with a clickable widget showing the
line count.

### 5. Filename — `title="..."` or `file:...` or `[filename]`

Displays a filename header above the code block. The filename also determines
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

---

## How It Works (Pipeline)

The annotation system has three stages:

### Stage 1: Encoding (`nuxt.config.ts` — `content:file:beforeParse` hook)

Before MDC or Shiki sees the markdown, the `beforeParse` hook scans every
fenced code block opening line and encodes annotation tokens so they don't
interfere with Shiki or the MDC parser.

**Encodings produced:**

| Source syntax    | Encoded token              |
| ---------------- | -------------------------- |
| `{"text":lines}` | `__EANN_<hex>_L_<lines>__` |
| `{"text"}`       | `__ELBL_<hex>__`           |
| `/pattern/`      | `__ECPT_<hex>__`           |
| `collapse={...}` | `collapse=__ECOL_<val>__`  |

The `hex` portion is the UTF-8 hex-encoded text. For example, `hello` → `68656c6c6f`.

Tokens are decoded back to their original form later. This encoding prevents
Shiki from misinterpreting `{ }`, `[ ]`, `/`, and other special characters.

The hook also:

- Infers language from `file:` extension if no language is given
- Inlines content from `.template/files/` paths

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
}
```

Decoding order:

1. Strip `__ELBL_` tokens → populate `labels[]`
2. Strip `__EANN_` tokens → populate `annotations[]` (with decoded text + line ranges)
3. Parse raw `{"text":lines}` fallback (for when encoding didn't run)
4. Strip `file:` and `title="..."` → populate `file`, `title`
5. Strip `collapse=...` → populate `collapseRanges[]`
6. Strip `showLineNumbers=...`
7. Decode `__ECPT_` tokens back to `/pattern/` strings
8. Parse remaining `/pattern/ [lines]` → populate `highlights[]`

Helper functions:

- `parseRanges(input)` — converts `"1-3,5,7-9"` to `[1,2,3,5,7,8,9]`
- `parseCollapseRanges(input)` — converts to `[{start, end}]` objects

### Stage 3a: SSR — Shiki transformers (`mdc.config.ts`)

Two transformers run during Shiki's server-side rendering:

**`ec-highlight`** — handles `/pattern/` highlighting:

- `preprocess(code, options)`: parses fence meta, creates Shiki `decorations[]`
  entries with `{line, character}` offsets for each regex match, setting
  `class: 'ec-highlight'`
- `line(lineNode, lineIndex)`: fallback that adds `ec-highlight` class to
  HAST `<span>` elements whose text matches the pattern

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
losing all annotation metadata. The re-highlighting uses `shiki-magic-move`'s
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
