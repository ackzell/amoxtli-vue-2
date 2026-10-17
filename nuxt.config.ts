import type { Logger, Plugin } from 'vite'
import { join, resolve } from 'node:path'

import process from 'node:process'
import { execaSync } from 'execa'

import {
  autoInjectChallengeCheck,
  encodeAnnotations,
  encodeCollapse,
  encodeMarkers,
  inferLangFromFilePath,
  inlineTemplateFiles,
  normalizeVueDiffFences,
  wrapLiveBlocks,
} from './lib/content-transforms'
import amoxtliLight from './themes/amoxtli-light'

// Some CJS deps in the MDC/twoslash chain (@vue/language-core, typescript) ship
// a `//# sourceMappingURL=` comment without publishing the referenced `.map`
// file. Vite's dev transform tries to read it, fails, and logs a harmless but
// noisy WARN on every boot. Drop exactly that message.
function silenceMissingSourcemap(): Plugin {
  return {
    name: 'amoxtli:silence-missing-sourcemap',
    configResolved(config) {
      const { logger } = config
      const warn = logger.warn.bind(logger)
      logger.warn = ((msg, options) =>
        typeof msg === 'string' && msg.startsWith('Failed to load source map for')
          ? undefined
          : warn(msg, options)) as Logger['warn']
    },
  }
}

export default defineNuxtConfig({
  modules: [
    '@vueuse/nuxt',
    '@unocss/nuxt',
    '@nuxtjs/seo',
    '@nuxt/content',
    '@nuxt/image',
    '@nuxtjs/color-mode',
    '@pinia/nuxt',
    'floating-vue/nuxt',
    '@nuxt/eslint',
    '@nuxtjs/i18n',
    // local
    '~/modules/template-loader',
    '~/modules/almostnode-sw',
    '~/modules/nuxt-link',
    '@nuxt/scripts',
  ],
  devtools: {
    enabled: true,
  },
  app: {
    head: {
      titleTemplate: '%s - Amoxtli Vue',
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },

  site: {
    url: 'https://preview.amoxtli-vue.ackzell.dev',
  },

  colorMode: {
    classSuffix: '',
  },

  content: {
    build: {
      markdown: {
        rehypePlugins: {
          'rehype-external-links': {
            options: {
              target: '_blank',
              rel: 'noopener',
            },
          },
        },
        highlight: {
          langs: [
            'pug',
            'vue',
            'scss',
            'javascript',
            'typescript',
            'html',
            'json',
            'bash',
          ],
          theme: {
            default: amoxtliLight,
            dark: 'vesper',
          },
        },
      },
    },
  },

  runtimeConfig: {
    public: {
      buildTime: Date.now(),
      gitSha: execaSync('git', ['rev-parse', 'HEAD']).stdout.trim(),
      repoUrl: 'https://github.com/ackzell/amoxtli-vue-2',
      inviteOnly: true,
      pagesBranch: process.env.CF_PAGES_BRANCH || '',
    },
    inviteSecret: '',
    devtools: {
      iframeProps: {
        allow: 'cross-origin-isolated',
        credentialless: true,
      },
    },
  },

  // Local tooling stores that must never invalidate the dev app. `.codegraph/`
  // is the (gitignored) CodeGraph index: its writer rewrites db/wal/tmp files
  // continuously, and without this Nuxt's `builder:watch` sees each write,
  // regenerates the app + templates, and the resulting HMR churn starves the
  // in-browser WebContainer.
  ignore: [
    '**/.codegraph/**',
  ],

  features: {
    inlineStyles: false,
  },

  experimental: {
    watcher: 'parcel',
  },

  compatibilityDate: '2024-04-03',
  nitro: {
    preset: 'cloudflare-pages',
    storage: {
      invites: {
        driver: 'cloudflare-kv-binding',
        binding: 'AMVI_KV',
      },
      feedback: {
        driver: 'cloudflare-kv-binding',
        binding: 'AMVF_KV',
      },
    },
    devStorage: {
      invites: {
        driver: 'fs',
        base: join(process.cwd(), 'data', 'invites'),
      },
    },
    alias: {
      'monaco-editor-core': resolve('stubs/monaco-editor-core.mjs'),
      '@volar/monaco': resolve('stubs/@volar-monaco.mjs'),
      'shiki/engine/oniguruma': resolve('stubs/shiki-engine-oniguruma.mjs'),
      'shiki/wasm': resolve('stubs/shiki-wasm.mjs'),
    },
    routeRules: {
      '/**': {
        headers: {
          'Cross-Origin-Embedder-Policy': 'require-corp',
          'Cross-Origin-Opener-Policy': 'same-origin',
        },
      },
    },
  },
  vite: {
    build: {
      minify: 'esbuild',
      cssMinify: 'esbuild',
    },
    plugins: [silenceMissingSourcemap()],
    server: {
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
    },
    optimizeDeps: {
      include: [
        '@ark-ui/vue',
        '@shikijs/monaco',
        '@unhead/schema-org/vue',
        '@volar/monaco',
        '@volar/monaco/worker',
        '@vue/devtools-core',
        '@vue/devtools-kit',
        '@vue/language-service', // CJS
        '@vue/compiler-sfc',
        '@xterm/addon-fit', // CJS
        '@xterm/xterm', // CJS
        'birpc',
        'clsx',
        'dexie',
        'diff', // CJS
        'fuse.js',
        'jszip', // CJS
        'licia/toEl', // CJS
        'luna-console',
        'monaco-editor-core',
        'monaco-editor-core/esm/vs/editor/editor.api',
        'monaco-editor-core/esm/vs/editor/editor.worker',
        'monaco-editor/esm/vs/editor/editor.worker',
        'motion-v',
        'reka-ui',
        'shiki',
        '@shikijs/magic-move/vue',
        'shiki/core',
        'shiki/engine-javascript.mjs',
        'shiki/langs/pug.mjs',
        'shiki/langs/scss.mjs',
        'shiki/langs/vue.mjs',
        'shiki/themes/snazzy-light.mjs',
        'shiki/themes/vesper.mjs',
        'strip-json-comments',
        'typescript', // CJS
        'typescript/lib/tsserverlibrary', // CJS
        'vscode-uri',
      ],
    },
  },
  typescript: {
    includeWorkspace: true,
    tsConfig: {
      include: [
        '../content/**/.template/**/*.ts',
      ],
      // Challenge bank suites are typed/checked against challenges/tsconfig.json
      // (bare "harness" authoring module), not the Nuxt app graph. Nuxt merges
      // this into the generated .nuxt/tsconfig.json exclude list. Setting it in
      // the root tsconfig instead would REPLACE the generated list entirely
      // (which is what pulled node_modules back into the program).
      exclude: [
        '../challenges',
      ],
    },
  },

  hooks: {
    'mdc:configSources': async function (sources) {
      sources.push(join(process.cwd(), 'mdc.config.ts'))

      // await new Promise(resolve => setTimeout(resolve, 500))
    },
    'content:file:beforeParse': function (ctx) {
      // console.log('[content:file:beforeParse] ctx:', ctx)
      const { file } = ctx as { file: { id: string, body: string, dirname: string } }

      if (!file.id.endsWith('.md'))
        return

      const twoslashBlocks = file.body.match(/^`{3}[^\n]*twoslash[^\n]*/gm)
      if (twoslashBlocks) {
        console.log('[beforeParse] twoslash blocks found:', twoslashBlocks)
      }

      // The actual fence transforms live in lib/content-transforms.ts so they
      // can be pinned by tests. The order below must match the previous inline
      // hook; see lib/content-transforms.ts for per-function reference.
      file.body = normalizeVueDiffFences(file.body)
      file.body = inferLangFromFilePath(file.body)
      file.body = encodeAnnotations(file.body)
      file.body = encodeMarkers(file.body)
      file.body = encodeCollapse(file.body)
      file.body = inlineTemplateFiles(file.body, file.dirname)
      file.body = wrapLiveBlocks(file.body)
      file.body = autoInjectChallengeCheck(file.body, file.dirname)
    },

    'content:file:afterParse': function (ctx) {
      const { content } = ctx as { content: { path?: string } }
      if (content.path) {
        const cleaned = content.path.split('/').map(part => part.replace(/^\d+[a-z]*\./i, '')).join('/')
        if (cleaned !== content.path) {
          content.path = cleaned
        }
      }
    },

  },

  eslint: {
    config: {
      standalone: false,
      nuxt: {
        sortConfigKeys: true,
      },
    },
  },

  i18n: {
    locales: [
      {
        name: 'English',
        code: 'en',
        language: 'en-US',
        file: 'en.yaml',
      },
      {
        name: 'Español (MX)',
        code: 'es_mx',
        language: 'es-MX',
        file: 'es_mx.yaml',
      },
    ],
    strategy: 'prefix',
    defaultLocale: 'en',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
    },
    autoDeclare: true,
  },

  ogImage: {
    defaults: {
      component: 'OgImageDocs',
      props: {
        colorMode: 'dark',
      },
    },
    componentOptions: {
      global: true,
    },
  },

  scripts: {
    registry: {

    },
  },
})
