# ESLint Overrides for Markdown Code Fences

When ESLint lints a `.md` file, the `@eslint/markdown` processor (bundled by
`@antfu/eslint-config`) extracts each fenced code block and creates a **virtual
file** for it. The path of a virtual file is the markdown file's path plus an
index suffix:

````
content/en/05.reactivity/03-ref/index.md        ← the file
content/en/05.reactivity/03-ref/index.md/0.vue  ← first  ```vue``` fence
content/en/05.reactivity/03-ref/index.md/1.vue  ← second ```vue``` fence
content/en/05.reactivity/03-ref/index.md/2.vue  ← third  ```vue``` fence
````

An override that targets only the `.md` file does **not** apply to these
virtual children, so rules like `vue/no-ref-as-operand` (which has an
auto-fix) still fire on the fenced code.

---

## Solution

Match **both** the markdown file and its virtual children in the `files`
array using a second glob with a `/**` suffix:

```js
{
  files: [
    'content/**/05.reactivity/03-ref/index.md',
    'content/**/05.reactivity/03-ref/index.md/**',
  ],
  rules: {
    'vue/no-ref-as-operand': 'off',
  },
}
```

This is the same convention `@eslint/markdown` uses internally in its own
`processor` config (`files: ["**/*.md/**"]`).

---

## Concrete Example

The lesson at `content/en/05.reactivity/03-ref/index.md` demonstrates the
`vue/no-ref-as-operand` linting rule in a `twoslash` code fence. The code
intentionally omits `.value` so the rule error is displayed.

Without the `/**` pattern:

- The `.md` file itself is matched — override applies, no-op.
- The virtual file `index.md/0.vue` is **not** matched — `vue/no-ref-as-operand`
  stays at its default severity, and the auto-fix adds `.value` on save.

With the `/**` pattern, the virtual file inherits the override and the rule
stays off, preserving the intentional code.

---

## How to Verify

Run ESLint on the virtual file directly to confirm the rule is disabled:

```bash
npx eslint --no-eslintrc --config eslint.config.js \
  "content/en/05.reactivity/03-ref/index.md/0.vue"
```

Inspect the resolved rules for that path to confirm `vue/no-ref-as-operand` is
`"off"`:

```bash
npx eslint --no-eslintrc --config eslint.config.js \
  --print-config "content/en/05.reactivity/03-ref/index.md/0.vue" \
  | jq '.rules["vue/no-ref-as-operand"]'
```

(The file doesn't need to exist on disk — ESLint can print the config for any
virtual path.)

---

## Note on Broader `content/**` Overrides

The existing `content/**` rule block (at `eslint.config.js:40`):

```js
{
  files: ['content/**'],
  rules: {
    'vue/valid-template-root': 'off',
    'vue/valid-v-on': 'off',
    'unused-imports/no-unused-vars': 'off',
  },
}
```

has the same virtual-file gap — `content/**` matches files inside `content/`
but not virtual paths like `content/**/*.md/**`. Since those rules don't have
auto-fixers, the gap is harmless, but if any of them later acquire one, the
pattern should be updated to `['content/**', 'content/**/*.md/**']`.
