import { Buffer } from 'node:buffer'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { execaSync } from 'execa'

import amoxtliLight from './themes/amoxtli-light'

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
    '~/modules/nuxt-link',
    '@nuxt/scripts',
  ],
  devtools: {
    enabled: true,
  },
  app: {
    head: {
      titleTemplate: '%s - Amoxtli Vue',
      htmlAttrs: {
        lang: 'en-US',
      },
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
        '@webcontainer/api',
        '@xterm/addon-fit', // CJS
        '@xterm/xterm', // CJS
        'birpc',
        'clsx',
        'dexie',
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
        'v-code-diff',
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

      // console.log(`[content:file.body:beforeParse]: ${file.body}`)

      // Infer language from file extension when none is specified
      file.body = file.body.replace(
        /^(`{3,})([ \t]*(?:file|solution):\/(\S+))([ \t][^\n]*)?\n/gm,
        (match, fence, filePrefix, filePath, rest) => {
          const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
          const extMap: Record<string, string> = {
            vue: 'vue',
            ts: 'typescript',
            tsx: 'typescript',
            js: 'javascript',
            jsx: 'javascript',
            html: 'html',
            css: 'css',
            scss: 'scss',
            json: 'json',
            md: 'markdown',
            py: 'python',
            sh: 'bash',
            yaml: 'yaml',
            yml: 'yaml',
          }
          const lang = extMap[ext]
          if (!lang)
            return match
          return `${fence}${lang} ${filePrefix}${rest ?? ''}\n`
        },
      )

      // Run repeatedly until no more annotation tokens remain on fence lines
      // This handles multiple {"text":lines} on the same opening fence
      const annotationRe = /^(`{3}[^\n]*)\{"([^"]+)":([0-9,\- ]+)\}/gm
      while (annotationRe.test(file.body)) {
        file.body = file.body.replace(
          annotationRe,
          (_, before, text, lines) => {
            const hex = Buffer.from(text).toString('hex')
            const lineStr = lines.trim().replace(/\D+/g, '_')
            return `${before}__EANN_${hex}_L_${lineStr}__`
          },
        )
        annotationRe.lastIndex = 0
      }

      // Encode bare {"text"} annotations (without line numbers) so Shiki doesn't
      // try to parse them as decoration specs and fail
      const beforeBare = file.body
      file.body = file.body.replace(
        /^(`{3}[^\n]*)\{"([^"]+)"\}(?=\s|$)/gm,
        (_, before, text) => {
          const hex = Buffer.from(text).toString('hex')
          console.log(`[beforeParse] ENCODING bare label "${text}" as __ELBL_${hex}__`)
          return `${before}__ELBL_${hex}__`
        },
      )
      if (file.body !== beforeBare) {
        console.log(`[beforeParse] Label encoding modified: ${file.id}`)
      }

      // Encode entire /pattern/ highlight specs as opaque hex tokens so MDC
      // never sees { }, [ ], or other special characters inside them.
      // Require leading whitespace so we don't match / in file: paths.
      file.body = file.body.replace(
        /^(`{3}[^\n]*)$/gm,
        (fullLine) => {
          return fullLine.replace(
            /(?<=\s)\/([^/]+)\/(?=[\s\d,\-]|$)/g,
            (_match) => {
              const hex = Buffer.from(_match).toString('hex')
              return `__ECPT_${hex}__`
            },
          )
        },
      )

      // Handle multiple annotations on the same line by running until no more matches
      // (the above replace handles one per call, but g flag handles all on same line)

      const templateDir = join(file.dirname, '.template', 'files')
      const solutionsDir = join(file.dirname, '.template', 'solutions')

      if (existsSync(templateDir) || existsSync(solutionsDir)) {
        file.body = file.body.replace(
          /^(`{3,})(\w+)?[ \t]*(file|solution):\/(\S+)([ \t][^\n]*)?\n([\s\S]*?\n)?\1/gm,
          (match, fence, lang, prefix, filePath, rest) => {
            const baseDir = prefix === 'solution' ? solutionsDir : templateDir
            const fullPath = join(baseDir, filePath)
            if (!existsSync(fullPath)) {
              return match
            }
            const content = readFileSync(fullPath, 'utf-8').trimEnd()
            return `${fence}${lang ?? ''} ${prefix}:/${filePath}${rest ?? ''}\n${content}\n${fence}`
          },
        )

        // Escape collapse braces so MDC doesn't consume them as attribute syntax
        file.body = file.body.replace(
          /^(`{3}[^\n]*)collapse=\{([^}]+)\}/gm,
          (_, before, val) => `${before}collapse=__ECOL_${val}__`,
        )

        // Encode title="..." with escaped quotes (\" and \\ and \` etc.)
        file.body = file.body.replace(
          /^(`{3}[^\n]*?)\s+title="((?:[^"\\]|\\.)*)"/gm,
          (match, prefix, titleValue) => {
            const decoded = titleValue.replace(/\\(["\\`])/g, '$1')
            const hex = Buffer.from(decoded).toString('hex')
            return `${prefix} title=__ETIT_${hex}__`
          },
        )
      }

      // Detect live code blocks and wrap in VueLive component.
      // Must run after file/solution inlining above so file:/path live works.
      file.body = file.body.replace(
        /^(`{3,})([^\n]*?)\blive\b([^\n]*)\n([\s\S]*?)\n\1/gm,
        (_, fence, before, after, code) => {
          const langMatch = before.match(/(\S+)/)
          const lang = langMatch ? langMatch[1] : 'vue'
          const b64 = Buffer.from(`${code}\n`).toString('base64')
          let hide = ''
          const hideMatch = (`${before} ${after}`).match(/hide=\{([^}]+)\}/)
          if (hideMatch)
            hide = hideMatch[1].replace(/\s+/g, '')
          const hideAttr = hide ? ` hide="${hide}"` : ''

          let showLineNumbers = ''
          const slnMatch = (`${before} ${after}`).match(
            /showLineNumbers(?:=\s*(?:\{\s*)?(true|false)\s*\}?)?/,
          )
          if (slnMatch)
            showLineNumbers = slnMatch[1] ?? 'true'
          const slnAttr = showLineNumbers ? ` :showLineNumbers="${showLineNumbers}"` : ''

          let showConsole = ''
          const scMatch = (`${before} ${after}`).match(
            /showConsole(?:=\s*(?:\{\s*)?(true|false)\s*\}?)?/,
          )
          if (scMatch)
            showConsole = scMatch[1] ?? 'true'
          const scAttr = showConsole ? ` :showConsole="${showConsole}"` : ''

          return `:vue-live{code="${b64}" lang="${lang}"${hideAttr}${slnAttr}${scAttr}}`
        },
      )
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
        file: 'en.yaml',
      },
      {
        name: 'Español (MX)',
        code: 'es_mx',
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
