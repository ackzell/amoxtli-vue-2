# Invite-Only Gate System

The invite gate restricts access to the tutorial preview to people with a
one-time invite code. It is enabled by setting `NUXT_PUBLIC_INVITE_ONLY=true`
(default for preview). Set it to `false` to open the gate for public launch.

---

## Flow

```
Visitor
  │
  ├── GET /join/<CODE> ──────────► server/routes/join/[code].get.ts
  │                                read-only: looks up the invite, resolves
  │                                a locale, redirects to
  │                                /{locale}/invite?code=…[&error=…]
  │                                (never redeems, never sets a session)
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
  │                               evaluateInvite() → invalid/revoked/
  │                                 expired/exhausted → 400
  │                               take a seat (append to redemptions)
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

| File                                 | Purpose                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| `server/utils/invite.ts`             | `InviteData`/`SessionData` types, HMAC-SHA256 sign/verify, `evaluateInvite`     |
| `server/api/invite/validate.post.ts` | Validates name+code, takes a seat, sets `amv_session` cookie                    |
| `server/api/invite/status.get.ts`    | Reads `amv_session` cookie, returns `{ valid, alias, agreed }`                  |
| `server/api/invite/agree.post.ts`    | Sets `session.agreed = true`, re-signs cookie                                   |
| `server/routes/join/[code].get.ts`   | Short shareable link `/join/<CODE>` — read-only redirect to the pre-filled form |
| `middleware/invite.global.ts`        | Route guard — redirects unauthenticated → `/locale/invite`                      |
| `middleware/index.global.ts`         | Redirects `/` → `/en` (locale prefix, runs before invite)                       |
| `app.vue`                            | Root component — checks session on mount/route change, shows AgreementDialog    |
| `pages/invite.vue`                   | Gate page with name + code form, pre-fills `?code=`, redirects validated users  |
| `components/AgreementDialog.vue`     | Modal overlay with agreement text, Continue button calls `/api/invite/agree`    |
| `scripts/generate-invites.ts`        | CLI to generate personal and group invite codes from a YAML/JSON list           |
| `scripts/invites-status.ts`          | Roster view: seats used, expiry, revocations, who redeemed when                 |
| `scripts/revoke-invite.ts`           | Kills a link for new redemptions (or `--undo`)                                  |
| `invites.yaml`                       | List of aliases (personal) and group entries for code generation                |
| `nuxt.config.ts`                     | `devStorage` (fs), `runtimeConfig` (`inviteOnly`, `inviteSecret`), KV binding   |
| `wrangler.toml`                      | Cloudflare KV binding `AMVI_KV`                                                 |
| `.env`                               | `NUXT_INVITE_SECRET`, `NUXT_PUBLIC_INVITE_ONLY`                                 |

---

## Data Structures

### InviteData (stored in KV)

```ts
interface Redemption {
  name: string // name the user entered at the gate
  at: number // timestamp of the redemption
  via: 'form' // how the seat was taken (only the form redeem path exists)
}

interface InviteData {
  alias: string // personal invite: the assigned alias
  used: boolean // legacy: true once at least one seat is taken
  usedAt: number | null // first redemption's timestamp
  usedByName: string | null // first redeemer's name
  createdAt: number // timestamp of code generation

  // Group invites only. A personal invite omits all of these, which is what
  // makes it a single-seat code.
  label?: string // e.g. "bitterbrains-oct"
  maxUses?: number // seat cap; absent means 1
  expiresAt?: number | null // epoch ms after which the link stops working
  revoked?: boolean // set to kill the link for new redemptions
  redemptions?: Redemption[] // one entry per seat taken
}
```

Key format in KV: `invite_<CODE>` (e.g. `invite_AMV-TY2A`).

Personal and group invites share this one record shape — a personal invite is
just a group invite with one seat that never expires and is never revoked.
Records written before group invites existed stay valid: seat count falls back
to the `used` flag when `redemptions` is absent.

### SessionData (stored in cookie)

```ts
interface SessionData {
  alias: string // name the user entered at the gate
  validatedAt: number // timestamp of validation
  agreed?: boolean // set once the agreement dialog is accepted
}
```

---

## Invite Generation

### Workflow

1. Add/edit entries in `invites.yaml`. Both styles can be mixed in one file:

   ```yaml
   # Personal: one seat, never expires, name is embedded in the code
   - Alice
   - Bob

   # Group: N seats, optional expiry, opaque code shared as a link
   - label: bitterbrains-oct
     seats: 3
     expires: 14d # 14d | 48h | 30m | 2w | 2026-11-01 | omit for never
   ```

2. Generate codes:

   ```sh
   pnpm invites:generate   # append codes for entries that don't have one yet
   pnpm invites:override   # regenerate everything (with overwrite confirmation)
   ```

   Group entries print their shareable link:

   ```
   bitterbrains-oct         AMV-BZ78KA
                            seats: 3   expires: 2026-11-01
                            https://preview.amoxtli-vue.ackzell.dev/join/AMV-BZ78KA
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

Personal aliases in `invites.yaml` are for **your reference only** — they are
NOT stored alongside the invite data in KV. The entered name is stored
separately as `usedByName` at validation time. This means you can give a code
to any person regardless of the alias you originally assigned.

Group `label`s **are** stored in KV (as `InviteData.label`) so the roster view
can tell you which cohort redeemed a link, how many seats went, and when.

---

## Short links (`/join/<CODE>`)

A group entry's shareable link is:

```
https://preview.amoxtli-vue.ackzell.dev/join/AMV-BZ78KA
```

`server/routes/join/[code].get.ts` handles it. It resolves a locale from `?l=`,
then `Accept-Language`, then `en`, looks the invite up, and redirects to the
gate page with the code pre-filled:

| Invite state   | Redirect                                           |
| -------------- | -------------------------------------------------- |
| Usable         | `/{locale}/invite?code=AMV-BZ78KA`                 |
| Revoked        | `/{locale}/invite?code=AMV-BZ78KA&error=revoked`   |
| Expired        | `/{locale}/invite?code=AMV-BZ78KA&error=expired`   |
| No seats left  | `/{locale}/invite?code=AMV-BZ78KA&error=exhausted` |
| Malformed code | `/{locale}/invite?code=...&error=invalid`          |

`pages/invite.vue` pre-fills the code, shows a message for `error`, focuses the
name field, and strips both params from the address bar with
`history.replaceState` so the code doesn't linger in history or leak through a
Referer header.

> **Invariant: a GET must never redeem a seat.** The short link is read-only —
> it never writes to KV and never sets a session. Redemption stays a deliberate
> form submit on the invite page. This is load-bearing: Slack/Teams/Outlook
> link previews and antivirus scanners fetch every URL they see, so a GET that
> consumed a seat would drain a link before a human ever clicked it. Don't
> "optimise" this into an auto-redeeming link.

---

## Expiry and revocation

`evaluateInvite(invite, now)` in `server/utils/invite.ts` is the single source
of truth (`ok` / `invalid` / `revoked` / `expired` / `exhausted`). Both the
validate endpoint and the short link use it.

- **Expiry** is checked against server time. `expires: 14d` is resolved to an
  absolute timestamp at _generation_ time, not redemption time.
- **Revocation** blocks **new** redemptions only. Anyone who already redeemed
  keeps a valid `amv_session` for its full 30-day lifetime — revoking does not
  log anyone out, and there is currently no way to do so per-link.

```sh
pnpm invites:revoke AMV-BZ78KA          # kill the link
pnpm invites:revoke AMV-BZ78KA --undo   # make it usable again
```

Accepts a bare code, an `invite_`-prefixed key, or a full `/join/...` URL.

Two KV limits to be aware of:

- **Eventual consistency** — a revoke or expiry can take up to ~60s to be
  visible globally.
- **Non-atomic seat counting** — the read-modify-write on `redemptions` is not
  transactional, so two simultaneous redemptions can over-issue a seat by one.
  Acceptable at "a handful of evaluators per link" scale.

---

## Tracking and Ops

```sh
pnpm invites:status            # reads the remote KV namespace
pnpm invites:status -- --local # reads data/invites/ instead (no network)
```

The remote path costs two wrangler calls regardless of how many invites exist:
it lists the keys, then fetches every value in `bulk/get` batches of 100 (that
endpoint's per-request maximum). Per-key reads were dropped because spawning
wrangler once per invite dominated the runtime — 41 invites went from ~60s to
~9s.

Prints one block per link — seats used, expiry, status, and each redemption's
name and time (UTC):

```
  bitterbrains-oct  —  2/3 seats
    code       AMV-BZ78KA
    link       https://preview.amoxtli-vue.ackzell.dev/join/AMV-BZ78KA
    expires    2026-11-01 (in 14d)
    redeemed   Ana                  2026-10-18 12:06
               Luis                 2026-10-18 12:06
```

Status flags: `REVOKED`, `EXPIRED`, and `FULL` (a group invite out of seats).
A plain personal invite simply reads `used` or `unused`.

This is the view for deciding when to follow up and how to word it.

### Backfilling legacy aliases

Records written before the generator stored an `alias` have only
`{ used, usedAt, usedByName, createdAt }`, so append mode cannot tell which
YAML entry they correspond to and will mint a duplicate for an existing name.

```sh
pnpm invites:backfill           # dry run: shows what would be recovered
pnpm invites:backfill -- --write
```

It recovers the alias from the code itself — personal codes are
`AMV-<alias><4 random chars>` — which is safe here because every legacy record
predates group invites, whose codes are opaque. Codes with no alias part
(`AMV-LCKG`) are reported and skipped. Re-running is a no-op.

Local only: remote KV is untouched. This makes **local** append mode work; it
does not change what `/join` serves.

---

## Security notes

- **The invite secret fails closed.** `getInviteSecret()` throws if
  `NUXT_INVITE_SECRET` is empty, rather than signing with an empty key (which
  would make every session forgeable). A secret shorter than 32 characters logs
  a warning.
- **Sessions expire server-side.** The cookie's `maxAge` is only enforced by the
  client, so `verifySession` also rejects a session older than 30 days. A
  captured cookie is not replayable forever.
- **The signature is verified in constant time** via `crypto.subtle.verify`.
- **Codes are validated before they reach KV** (`INVITE_CODE_PATTERN`), and the
  entered name is length-capped (`MAX_NAME_LENGTH`).
- **Invite URLs are `no-store`, `no-referrer`, and `noindex`** (see the
  `routeRules` in `nuxt.config.ts` and the `robots` disallow list).
- Group codes are **opaque**; personal codes embed the alias, so a leaked
  personal link reveals who it was for.

### Known gaps (not yet addressed)

- **No rate limiting** on `/api/invite/validate` or `/join/*`. Personal codes
  carry ~32^4 of entropy behind a guessable alias prefix, so this is the
  highest-value remaining control. The zone is on the **Free** plan, which
  allows exactly one rate limiting rule, matching on Path only, counting by IP,
  with a 10s period and a 10s mitigation. Keep the expression narrow —
  `/api/invite/validate` plus `/join/`, **not** all of `/api/*` — because
  `/api/invite/status` is polled on navigation and would trip a broad rule.
- **No per-link session invalidation** — `SessionData` does not record which
  invite it came from. Revocation cannot reach existing sessions.
- **`secure` on the cookie** is driven by `NODE_ENV`; confirm it holds in the
  Cloudflare Workers bundle.

---

## Validation Endpoint

```
POST /api/invite/validate
Content-Type: application/json

{ "name": "Alice", "code": "AMV-TY2A" }
```

On success:

- Appends a `redemptions` entry (`name`, `at`, `via: 'form'`)
- On the first seat, also sets `used = true`, `usedAt`, `usedByName`
- Creates an HMAC-SHA256 signed session cookie (`amv_session`)
- Returns `{ valid: true, alias: "Alice" }`

On failure (4xx):

- Missing name/code → `400 "Name and invite code are required"`
- Name over `MAX_NAME_LENGTH` → `400 "Name is too long (max 64 characters)"`
- Code fails `INVITE_CODE_PATTERN` → `400 "Invalid invite code"`
- Unknown code → `400 "Invalid invite code"`
- Personal invite already redeemed → `400 "This code has already been used"`
- Group invite out of seats → `400 "This invite link has no seats left"`
- Past `expiresAt` → `400 "This invite link has expired"`
- `revoked` → `400 "This invite link has been revoked"`

---

## Agreement Dialog

After a successful validation, the user is navigated to `/locale` (the tutorial).
`app.vue` checks the session on mount and whenever the route changes to a
non-invite path. If the session is valid but `agreed` is `false`, it renders
`<AgreementDialog>` as a modal overlay on top of the tutorial.

The invite form page (`pages/invite.vue`) also checks the session on mount:

| Session state    | Redirect                         |
| ---------------- | -------------------------------- |
| Valid session    | `/locale` (dialog handles agree) |
| No valid session | Show the form                    |

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
- **MaxAge**: 30 days (also enforced server-side — a session older than 30 days
  is rejected even if the cookie is replayed)
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
