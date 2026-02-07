import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  plugins: [
    {
      name: 'playground-color-mode',
      transformIndexHtml(html) {
        return {
          html,
          tags: [
            {
              tag: 'style',
              attrs: {},
              injectTo: 'head',
              children: `
                html:not(.dark) body { background: #ffffff; color: #2c3e50; }
                html.dark body { background: #1a1a2e; color: #e5e7eb; }
                body { transition: background-color 0.15s, color 0.15s; }
              `,
            },
            {
              tag: 'script',
              attrs: {},
              injectTo: 'head',
              children: `
                window.addEventListener('message', function(e) {
                  if (e.data && e.data.source === 'nuxt-playground-color-mode') {
                    document.documentElement.classList.toggle('dark', e.data.mode === 'dark');
                  }
                });
                window.parent.postMessage({ source: 'nuxt-playground-color-mode-request' }, '*');
              `,
            },
          ],
        }
      },
    },
  ],
})
