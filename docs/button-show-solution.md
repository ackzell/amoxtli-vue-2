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
  :show-solution-message="$t(guide.buttonSolutionMessage)"
  :reset-message="$t(guide.buttonResetMessage)"
/>
```

These are already translated i18n values resolved from the guide store's
computed properties.

### 2. Guide Meta (middle priority)

When no props are passed (as with `<ButtonShowSolution />` in `.md` files),
the component reads from the guide store's `buttonSolutionMessage` and
`buttonResetMessage` computed properties and passes them through `$t()` to
resolve the final display string.

The guide store's computed properties return **i18n keys** when the guide meta
sets them, or **translated strings** when falling back to defaults:

```ts
// stores/guide.ts
const buttonSolutionMessage = computed(
  () => currentGuide.value?.buttonSolutionMessage ?? $t('show-solution')
  //         raw i18n key ↑                      ↑ already translated
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

| Key               | English         | Japanese       |
| ----------------- | --------------- | -------------- |
| `show-solution`   | Show solution   | 解答を表示     |
| `reset-challenge` | Reset challenge | 挑戦をリセット |

Defined in `i18n/locales/en.yaml` and `i18n/locales/ja.yaml`.

---

## How It Works (Data Flow)

```
┌─────────────────────────────────────────────────────────────┐
│  .template/index.ts                                         │
│  (buttonSolutionMessage, buttonResetMessage)                │
└──────────────────────┬──────────────────────────────────────┘
                       │ loaded via import.meta.glob
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  pages/[...slug].vue                                        │
│  (loadGuideMeta → guide.setGuideMeta())                     │
└──────────────────────┬──────────────────────────────────────┘
                       │ stored in Pinia
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  stores/guide.ts                                            │
│  (buttonSolutionMessage / buttonResetMessage computed)       │
└─────────┬───────────────────────────────────┬───────────────┘
          │                                   │
          ▼                                   ▼
┌──────────────────┐            ┌──────────────────────────┐
│ PanelEditor.vue  │            │ ButtonShowSolution.vue   │
│ (passes as prop) │            │ (reads from guide store  │
│                  │            │  when props are absent)  │
└──────────────────┘            └──────────────────────────┘
```

When `<ButtonShowSolution />` is used inline in `.md` files, no props reach
the component — Nuxt Content's MDC parser resolves the component tag but
doesn't forward store data. The component therefore falls through to the
guide store's computed properties, which picks up `buttonSolutionMessage` /
`buttonResetMessage` from the guide meta if set.

---

## Related Files

| File                                        | Role                                                                 |
| ------------------------------------------- | -------------------------------------------------------------------- |
| `components/content/ButtonShowSolution.vue` | Component with the fallback chain                                    |
| `stores/guide.ts`                           | Computed properties for button text                                  |
| `types/guides.ts`                           | `GuideMeta` interface (`buttonSolutionMessage`/`buttonResetMessage`) |
| `components/PanelEditor.vue`                | Passes translated props to component                                 |
| `pages/[...slug].vue`                       | Loads guide meta dynamically                                         |
| `i18n/locales/en.yaml`                      | Default English button labels                                        |
| `i18n/locales/ja.yaml`                      | Default Japanese button labels                                       |
