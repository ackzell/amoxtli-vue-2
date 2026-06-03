# Invite-Only Gate System

The invite gate restricts access to the tutorial preview to people with a
one-time invite code. It is enabled by setting `NUXT_PUBLIC_INVITE_ONLY=true`
(default for preview). Set it to `false` to open the gate for public launch.

---

## Flow

```
Visitor
  │
  ▼
GET / ─────────────────────────► index.global.ts
  │                               redirect / → /en
  ▼
GET /en ───────────────────────► invite.global.ts
  │                               no valid session?
  │                               redirect /en → /en/invite
  ▼
GET /en/invite ───────────────── pages/invite.vue
  │                               check session
  │                               if valid → /en
  │                               else show form
  │
  │  (user enters name + code)
  │
  ▼
POST /api/invite/validate ───── validate.post.ts
  │                               look up code in KV
  │                               if not found → 400
  │                               if already used → 400
  │                               mark used, store usedByName
  │                               create HMAC-signed session cookie
  │                               return { valid: true, alias }
  ▼
navigateTo('/en') ────────────── app.vue (onMounted / route watch)
  │                               fetch /api/invite/status
  │                               if valid + !agreed → show AgreementDialog
  │
  │  (user reads + clicks Continue)
  │
  ▼
POST /api/invite/agree ──────── agree.post.ts
  │                               update session: agreed = true
  │                               re-sign cookie
  │                               return { agreed: true }
  ▼
AgreementDialog emits close ──── app.vue hides dialog
  ▼
Tutorial renders
```

---

## Key Files

| File                                 | Purpose                                                                       |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| `server/utils/invite.ts`             | `InviteData`/`SessionData` types, HMAC-SHA256 sign/verify, KV helpers         |
| `server/api/invite/validate.post.ts` | Validates name+code, marks invite used, sets `amv_session` cookie             |
| `server/api/invite/status.get.ts`    | Reads `amv_session` cookie, returns `{ valid, alias, agreed }`                |
| `server/api/invite/agree.post.ts`    | Sets `session.agreed = true`, re-signs cookie                                 |
| `middleware/invite.global.ts`        | Route guard — redirects unauthenticated → `/locale/invite`                    |
| `middleware/index.global.ts`         | Redirects `/` → `/en` (locale prefix, runs before invite)                     |
| `app.vue`                            | Root component — checks session on mount/route change, shows AgreementDialog |
| `pages/invite.vue`                   | Gate page with name + code form, redirects validated users → `/locale`        |
| `components/AgreementDialog.vue`     | Modal overlay with agreement text, Continue button calls `/api/invite/agree` |
| `scripts/generate-invites.ts`        | CLI to generate invite codes from YAML/JSON name list                         |
| `invites.yaml`                       | List of aliases for code generation                                           |
| `nuxt.config.ts`                     | `devStorage` (fs), `runtimeConfig` (`inviteOnly`, `inviteSecret`), KV binding |
| `wrangler.toml`                      | Cloudflare KV binding `AMVI_KV`                                               |
| `.env`                               | `NUXT_INVITE_SECRET`, `NUXT_PUBLIC_INVITE_ONLY`                               |

---

## Data Structures

### InviteData (stored in KV)

```ts
interface InviteData {
  used: boolean // true after first validation
  usedAt: number | null // timestamp of validation
  usedByName: string | null // name the user entered at the gate
  createdAt: number // timestamp of code generation
}
```

Key format in KV: `invite_<CODE>` (e.g. `invite_AMV-TY2A`).

### SessionData (stored in cookie)

```ts
interface SessionData {
  alias: string // name the user entered at the gate
  validatedAt: number // timestamp of validation
}
```

---

## Invite Generation

### Workflow

1. Add/edit aliases in `invites.yaml`:

   ```yaml
   - Alice
   - Bob
   - Charlie
   ```

2. Generate codes:

   ```sh
   pnpm generate-invites          # fresh (with overwrite confirmation)
   pnpm generate-invites:append   # add codes only for new aliases
   ```

   This produces:
   - `data/invites/invite_AMV-XXXX` — local KV dev storage (one file per code)
   - `invites-batch.json` — wrangler bulk upload format (gitignored)

3. Upload to Cloudflare KV for production:
   ```sh
   pnpm publish-invites
   ```

### Script behavior

- **No flag**: generates for all YAML entries, shows confirmation if local files exist
- `--append`: only generates codes for aliases not yet in `data/invites/`, appends to batch file
- `--force`: skips the confirmation prompt (non-interactive use)
- Non-TTY detection: prints an error instead of hanging on piped stdin

### Internal tracking

Aliases in `invites.yaml` are for **your reference only** — they are NOT stored
alongside the invite data in KV. The entered name is stored separately as
`usedByName` at validation time. This means you can give a code to any person
regardless of the alias you originally assigned.

---

## Validation Endpoint

```
POST /api/invite/validate
Content-Type: application/json

{ "name": "Alice", "code": "AMV-TY2A" }
```

On success:

- Marks the invite `used = true`
- Stores `usedByName = name.trim()` in the invite record
- Creates an HMAC-SHA256 signed session cookie (`amv_session`)
- Returns `{ valid: true, alias: "Alice" }`

On failure (4xx):

- Missing name/code → `400 "Name and invite code are required"`
- Invalid code → `400 "Invalid invite code"`
- Already used → `400 "This code has already been used"`

---

## Agreement Dialog

After a successful validation, the user is navigated to `/locale` (the tutorial).
`app.vue` checks the session on mount and whenever the route changes to a
non-invite path. If the session is valid but `agreed` is `false`, it renders
`<AgreementDialog>` as a modal overlay on top of the tutorial.

The invite form page (`pages/invite.vue`) also checks the session on mount:

| Session state    | Redirect                          |
| ---------------- | --------------------------------- |
| Valid session    | `/locale` (dialog handles agree)  |
| No valid session | Show the form                     |

The dialog calls `POST /api/invite/agree` which sets `session.agreed = true` and
re-signs the cookie. On success the dialog closes and the user proceeds to the
tutorial content beneath it.

The agreement flag persists in the session cookie for its full 30-day lifetime.
Subsequent visits with a valid session skip the dialog entirely.

---

## Session Cookie

- **Name**: `amv_session`
- **Format**: `base64url(payload).hex(signature)` — e.g.
  `eyJhbGlhcyI6IkFsaWNlIn0.a1b2c3d4...`
- **Algorithm**: HMAC-SHA256 via Web Crypto API (`crypto.subtle.sign`)
- **MaxAge**: 30 days
- **Flags**: `httpOnly`, `sameSite=lax`, `secure` in production
- **Key**: `NUXT_INVITE_SECRET` from `.env`

The cookie is verified on every middleware check (`/api/invite/status`) and
cached client-side after the first successful check to avoid redundant API
calls on SPA navigation.

---

## Route Guard

`middleware/invite.global.ts` runs on every navigation:

1. If `NUXT_PUBLIC_INVITE_ONLY` is `false`, allow all traffic (pass through)
2. If path starts with `/api/` or is `/locale/invite` or `/locale/invite/*`, allow through
3. If client-side and previously validated (`cachedValid`), allow through
4. Fetch `/api/invite/status` — if valid, cache and allow through
5. Otherwise redirect to `/en/invite`

---

## Local Development

The Nitro devStorage mounts an `fs` driver at `data/invites/` for local KV
emulation. Files are stored by exact key name (no `.json` extension):

```
data/invites/
├── invite_AMV-XXXX    # content: { "used": false, ... }
├── invite_AMV-YYYY
└── invite_AMV-ZZZZ
```

### Toggling the gate

| Variable                        | Effect                         |
| ------------------------------- | ------------------------------ |
| `NUXT_PUBLIC_INVITE_ONLY=true`  | Gate enabled (default preview) |
| `NUXT_PUBLIC_INVITE_ONLY=false` | Gate disabled, full access     |

### Required env vars

```
NUXT_PUBLIC_INVITE_ONLY=true
NUXT_INVITE_SECRET=<64-char hex string>
```

---

## Deployment

### Cloudflare KV

The production KV namespace `AMVI_KV` is configured in `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "AMVI_KV"
id = "..."
```

Upload invites with:

```sh
pnpm publish-invites
```

### Custom domain

Deployed to `preview.amoxtli-vue.ackzell.dev` using Cloudflare Pages +
Workers with the `cloudflare-pages` Nitro preset.
