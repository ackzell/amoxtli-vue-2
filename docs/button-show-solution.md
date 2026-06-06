# Button Show Solution

The `<ButtonShowSolution />` component renders a toggle button that swaps
between "show solution" and "reset challenge" states. It appears both in the
`PanelEditor` toolbar and inline in `.md` content via MDC.

---

## Button Text Resolution

The button label is determined by a **fallback chain** with three levels:

```
Prop → Guide Meta → i18n default
```

### 1. Prop (highest priority)

When used in `PanelEditor.vue`, the component receives props directly:

```vue
<ButtonShowSolution
  :show-solution-message="guide.buttonSolutionMessage"
  :reset-message="guide.buttonResetMessage"
/>
```

The props are already translated strings resolved from the guide store.

### 2. Guide Meta (middle priority)

When no props are passed (as with `<ButtonShowSolution />` in `.md` files),
the component reads from the guide store's `buttonSolutionMessage` and
`buttonResetMessage` computed properties directly.

These computed properties always return **translated strings**:

```ts
// stores/guide.ts
const buttonSolutionMessage = computed(
  () => currentGuide.value?.buttonSolutionMessage
    ? t(currentGuide.value.buttonSolutionMessage)
    : t('show-solution')
)
```

To customize the text for a specific guide, set these fields in its
`.template/index.ts`:

```ts
// content/en/xx.lesson/.template/index.ts
export const meta: GuideMeta = {
  // ...
  buttonSolutionMessage: 'my-custom-key',
  buttonResetMessage: 'my-other-key',
}
```

The values are **i18n keys**, not literal strings. Corresponding translations
must exist in `i18n/locales/*.yaml`.

### 3. i18n default (fallback)

If neither prop nor guide meta provides a value, the component falls back to
the default i18n keys:

| Key               | English          | Japanese              |
| ----------------- | ---------------- | --------------------- |
| `show-solution`   | Show solution    | 解答を表示            |
| `reset-challenge` | Reset challenge  | 挑戦をリセット        |

Defined in `i18n/locales/en.yaml` and `i18n/locales/ja.yaml`.

---

## Data Flow

```
┌──────────────────────────────────────────────┐
│  .template/index.ts                          │
│  (buttonSolutionMessage, buttonResetMessage) │
│  e.g. 'script-setup' (raw i18n keys)         │
└─────────────────────┬────────────────────────┘
                      │ loaded via import.meta.glob
                      ▼
┌──────────────────────────────────────────────┐
│  pages/[...slug].vue                         │
│  (loadGuideMeta → guide.setGuideMeta())      │
└─────────────────────┬────────────────────────┘
                      │ stored in Pinia
                      ▼
┌──────────────────────────────────────────────┐
│  stores/guide.ts                             │
│                                              │
│  buttonSolutionMessage = t('script-setup')   │
│  → "Script Setup" (translated)               │
└─────────┬────────────────────┬───────────────┘
          │                    │
          ▼                    ▼
┌──────────────────┐  ┌──────────────────────────┐
│ PanelEditor.vue  │  │ ButtonShowSolution.vue   │
│                   │  │                          │
│ passes translated │  │ .md usage: no props      │
│ string as prop    │  │ falls to store value     │
│                   │  │ (already translated)     │
└──────────────────┘  └──────────────────────────┘
```

The guide store is the single point of translation — it converts the guide
meta's raw i18n keys into translated strings via `t()`. Both `PanelEditor`
(which passes the value as a prop) and inline `.md` usage (which reads from
the store directly) receive already-translated strings, so the component
never needs to call `$t()` itself.

---

## Related Files

| File                                                    | Role                                                |
| ------------------------------------------------------- | --------------------------------------------------- |
| `components/content/ButtonShowSolution.vue`             | Component — reads props or store directly           |
| `stores/guide.ts`                                       | Always returns translated strings via `t()`         |
| `types/guides.ts`                                       | `GuideMeta` interface (`buttonSolutionMessage`/`buttonResetMessage`) |
| `components/PanelEditor.vue`                            | Passes store value directly as prop                 |
| `pages/[...slug].vue`                                   | Loads guide meta dynamically                        |
| `i18n/locales/en.yaml`                                  | Default English button labels                       |
| `i18n/locales/ja.yaml`                                  | Default Japanese button labels                      |
