import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname } from 'node:path'

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
}

const INJECTED_STYLE = `
<style>
  html:not(.dark) body { background: #ffffff; color: #2c3e50; }
  html.dark body { background: #101010; color: #e5e7eb; }
  body { transition: background-color 0.15s, color 0.15s; }
</style>`

const INJECTED_SCRIPT = `
<script>
  window.addEventListener('message', function(e) {
    if (e.data && e.data.source === 'nuxt-playground-color-mode') {
      document.documentElement.classList.toggle('dark', e.data.mode === 'dark');
    }
  });
  window.parent.postMessage({ source: 'nuxt-playground-color-mode-request' }, '*');
<\/script>`

createServer(async (req, res) => {
  try {
    const file = req.url === '/' ? '/index.html' : req.url
    let content = await readFile(`.${file}`, 'utf-8')
    const mime = MIME[extname(file)] ?? 'text/plain'

    if (mime === 'text/html') {
      // Inject before </head> if present, otherwise prepend
      if (content.includes('</head>')) {
        content = content.replace('</head>', `${INJECTED_STYLE}${INJECTED_SCRIPT}</head>`)
      }
      else {
        content = INJECTED_STYLE + INJECTED_SCRIPT + content
      }
    }

    res.writeHead(200, { 'Content-Type': mime })
    res.end(content)
  }
  catch {
    res.writeHead(404)
    res.end('Not found')
  }
}).listen(5173, '0.0.0.0')
