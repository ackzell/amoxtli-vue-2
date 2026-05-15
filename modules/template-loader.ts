import type { ViteDevServer } from 'vite'
import { utimesSync } from 'node:fs'
import fs from 'node:fs/promises'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { addTemplate, addVitePlugin, defineNuxtModule } from '@nuxt/kit'
import { watch } from 'chokidar'
import fg from 'fast-glob'
import { join, relative, resolve } from 'pathe'

export default defineNuxtModule({
  meta: {
    name: 'template-loader',
  },

  setup(_, nuxt) {
    let viteServer: ViteDevServer | undefined
    const templateModules = new Set<string>()

    // Use a hook to ensure we have the live Vite server instance
    nuxt.hook('vite:serverCreated', (server) => {
      viteServer = server
      console.warn('🔥 Vite server attached via hook')
    })

    if (nuxt.options.dev) {
      const watcher = watch(
        join(process.cwd(), 'content'),
        { ignoreInitial: true },
      )

      watcher.on('all', async (event: string, path: string) => {
        if (!path.includes('.template/files'))
          return

        if (!viteServer) {
          // console.error('Vite server not available for HMR')
          return
        }

        // console.warn(`Template ${event}:`, path)

        // 1. READ RAW CONTENT FOR WEBCONTAINER
        let content = ''
        try {
          content = await fs.readFile(path, 'utf-8')
        }
        catch {
          if (event !== 'unlink')
            return // Ignore if file was just deleted
        }

        const filename = path.split('/').pop()

        // 2. BROADCAST TO FRONTEND
        if (event === 'change' || event === 'add') {
          console.warn('📡 Broadcasting template:update for:', filename)
          viteServer.ws.send({
            type: 'custom',
            event: 'template:update',
            data: { filename, content },
          })
        }

        // 3. INVALIDATE ALL MODULES UNDER .template/
        const templateDir = path.replace(/\.template\/files\/.+$/, '.template')
        for (const [, mod] of viteServer.moduleGraph.idToModuleMap) {
          if (mod.id && mod.id.includes('.template')) {
            viteServer.moduleGraph.invalidateModule(mod)
            console.warn('🗑️ Invalidated:', mod.id)
          }
        }

        // 4. INVALIDATE VITE GLOB VIRTUAL MODULES
        for (const [url, mod] of viteServer.moduleGraph.urlToModuleMap) {
          if (url.includes('glob') || url.includes('.template')) {
            viteServer.moduleGraph.invalidateModule(mod)
            // console.warn('Invalidated glob/template module:', url)
          }
        }

        // 5. TOUCH SIBLING MD TO TRIGGER CONTENT REPARSE
        try {
          const parentDir = resolve(path, '..', '..', '..')
          const siblingFiles = await fs.readdir(parentDir)
          const mdFile = siblingFiles.find(f => f.endsWith('.md'))
          if (mdFile) {
            const mdPath = join(parentDir, mdFile)
            // console.warn('Touching content file:', mdPath)
            const now = new Date()
            utimesSync(mdPath, now, now)
          }
        }
        catch (err) {
          // console.error('Failed to touch sibling MD:', err)
        }

        // 6. FULL RELOAD SO GLOB LOADERS RE-EXECUTE
        viteServer.ws.send({ type: 'full-reload' })
      })

      nuxt.hook('close', () => watcher.close())
    }

    // Default Templates
    const templates = ['vue', 'html']
    for (const name of templates) {
      addTemplate({
        filename: `templates/${name}.ts`,
        getContents: async () => {
          const dir = fileURLToPath(new URL(`../templates/${name}`, import.meta.url))
          const files = await fg('**/*.*', {
            ignore: ['**/node_modules/**', '**/.git/**', '**/.nuxt/**'],
            dot: true,
            cwd: dir,
            onlyFiles: true,
            absolute: true,
          })

          const filesMap: Record<string, string> = {}
          await Promise.all(
            files.sort().map(async (filename) => {
              const content = await fs.readFile(filename, 'utf-8')
              filesMap[relative(dir, filename)] = content
            }),
          )
          return `export default ${JSON.stringify(filesMap)}`
        },
      })
    }

    // The Transformer Plugin
    addVitePlugin({
      name: 'nuxt-playground:template-loader',
      enforce: 'pre',

      async transform(code, id) {
        if (!id.match(/\/\.template\/index\.ts/))
          return

        templateModules.add(id)
        console.warn('Transforming template index:', id)

        async function getFileMap(dir: string) {
          const files = await fg('**/*.*', {
            ignore: ['**/node_modules/**', '**/.git/**', '**/.nuxt/**'],
            dot: true,
            cwd: dir,
            onlyFiles: true,
            absolute: false,
          })

          if (!files.length)
            return undefined

          const filesMap: Record<string, string> = {}
          await Promise.all(
            files.sort().map(async (filename) => {
              const fullPath = resolve(dir, filename)
              const content = await fs.readFile(fullPath, 'utf-8')
              // console.warn('reading:', fullPath, content.slice(0, 50))
              filesMap[filename] = content
            }),
          )
          return filesMap
        }

        const [files, solutions] = await Promise.all([
          getFileMap(resolve(id, '../files')),
          getFileMap(resolve(id, '../solutions')),
        ])

        // console.warn('files map:', JSON.stringify(files, null, 2))

        return {
          code: [
            code,
            `meta.files = ${JSON.stringify(files)}`,
            `meta.solutions = ${JSON.stringify(solutions)}`,
            '',
          ].join('\n'),
          map: null,
        }
      },
    })
  },
})
