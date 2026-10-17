import { readFileSync } from 'node:fs'
import { addServerHandler, addTemplate, createResolver, defineNuxtModule } from '@nuxt/kit'

const SW_HEADERS = {
  'Content-Type': 'application/javascript; charset=utf-8',
  'Cache-Control': 'no-cache',
  'Service-Worker-Allowed': '/',
} as const

const VIRTUAL_FALLBACK_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Preview service worker not active</title>
  </head>
  <body style="font:14px/1.5 system-ui,sans-serif;margin:0;padding:24px;max-width:60ch;color:#333">
    <h1 style="font-size:16px">Preview service worker not active</h1>
    <p><code>/__virtual__/&lt;port&gt;/</code> is served by almostnode's service worker,
       not by this server.</p>
    <p>Reaching this page means the worker is not controlling the document that requested it.
       Registration is blocked in private windows, by some enterprise policies, and by automation
       settings such as Playwright's <code>serviceWorkers: "block"</code>.</p>
    <p>The in-browser dev server may still be running correctly — it is only unreachable.</p>
  </body>
</html>
`

/**
 * Serve `/__sw__.js` (the almostnode service worker) from the installed
 * `almostnode` package instead of a hand-copied file in `public/`.
 *
 * The SW content is inlined into the generated handler at build time, so the
 * deployed bundle is self-contained and always in sync with the installed
 * almostnode version (no drift).
 *
 * Also answers `/__virtual__/{port}/` when no worker is controlling the page.
 * Without it those URLs fall through to Nitro's 404, which carries
 * `X-Frame-Options: DENY`; the browser then refuses to render it and the whole
 * preview shows up as Chrome's error page with no explanation.
 */
export default defineNuxtModule({
  meta: {
    name: 'almostnode-sw',
  },
  setup() {
    const { resolve } = createResolver(import.meta.url)
    const swSource = resolve('../node_modules/almostnode/public/__sw__.js')

    let content: string
    try {
      content = readFileSync(swSource, 'utf-8')
    }
    catch {
      throw new Error(
        `almostnode-sw: could not read almostnode/public/__sw__.js from ${swSource}. `
        + 'Reinstall the almostnode dependency (its `files` must ship '
        + 'public/__sw__.js) and restart the dev server.',
      )
    }

    const generated = addTemplate({
      filename: 'almostnode-sw-route.mjs',
      write: true,
      getContents: () => `export default () =>
  new Response(${JSON.stringify(content)}, { headers: ${JSON.stringify(SW_HEADERS)} })
`,
    })

    addServerHandler({
      route: '/__sw__.js',
      handler: generated.dst,
    })

    // Only reachable when the worker is missing (otherwise it answers first).
    const fallback = addTemplate({
      filename: 'almostnode-virtual-fallback.mjs',
      write: true,
      getContents: () => `export default () =>
  new Response(${JSON.stringify(VIRTUAL_FALLBACK_HTML)}, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
`,
    })

    addServerHandler({
      route: '/__virtual__/**',
      handler: fallback.dst,
    })
  },
})
