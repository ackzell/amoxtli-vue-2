import { readFileSync } from 'node:fs'
import { addServerHandler, addTemplate, createResolver, defineNuxtModule } from '@nuxt/kit'

const SW_HEADERS = {
  'Content-Type': 'application/javascript; charset=utf-8',
  'Cache-Control': 'no-cache',
  'Service-Worker-Allowed': '/',
} as const

/**
 * Serve `/__sw__.js` (the almostnode service worker) from the installed
 * `almostnode` package instead of a hand-copied file in `public/`.
 *
 * The SW content is inlined into the generated handler at build time, so the
 * deployed bundle is self-contained and always in sync with the installed
 * almostnode version (no drift).
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
  },
})
