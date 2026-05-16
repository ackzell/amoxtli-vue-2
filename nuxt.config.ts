import { Buffer } from 'node:buffer'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

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
    url: 'https://amoxtli-vue.netlify.app',
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
      repoUrl: 'https://github.com/nuxt/learn.nuxt.com',
    },
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
        'monaco-editor/esm/vs/editor/editor.worker',
        'monaco-editor-core/esm/vs/editor/editor.worker',
        'typescript/lib/tsserverlibrary',
        '@vue/language-service',
        '@volar/monaco/worker',
        'typescript',
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
    },
    'content:file:beforeParse': function (ctx) {
      // console.log('[content:file:beforeParse] ctx:', ctx)
      const { file } = ctx as { file: { id: string, body: string, dirname: string } }

      if (!file.id.endsWith('.md'))
        return

      // Only replace on opening fence lines — no block spanning needed
      file.body = file.body.replace(
        /^(`{3}[^\n]*)\{"([^"]+)":([0-9,\- ]+)\}/gm,
        (_, before, text, lines) => {
          const hex = Buffer.from(text).toString('hex')
          const lineStr = lines.trim().replace(/\D/g, '_')
          return `${before}__EANN_${hex}_L_${lineStr}__`
        },
      )

      // Handle multiple annotations on the same line by running until no more matches
      // (the above replace handles one per call, but g flag handles all on same line)

      const templateDir = join(file.dirname, '.template', 'files')

      if (!existsSync(templateDir))
        return

      file.body = file.body.replace(
        /^(`{3,})(\w+)?[ \t]*file:\/(\S+)([ \t][^\n]*)?\n([\s\S]*?\n)?\1/gm,
        (match, fence, lang, filePath, rest) => {
          const fullPath = join(templateDir, filePath)
          if (!existsSync(fullPath))
            return match
          const content = readFileSync(fullPath, 'utf-8').trimEnd()
          return `${fence}${lang ?? ''} file:/${filePath}${rest ?? ''}\n${content}\n${fence}`
        },
      )
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
        name: '日本語',
        code: 'ja',
        file: 'ja.yaml',
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
