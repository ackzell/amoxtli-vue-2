import { readFile, watch } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname } from 'node:path'

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
}

const INJECTED_SCRIPT_BLOCKING = `
<script>
  (function() {
    if (!document.documentElement.classList.contains('dark')
      && sessionStorage.getItem('playground-dark') === 'true') {
      document.documentElement.classList.add('dark')
    }
  })();
<\/script>`

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
      const dark = e.data.mode === 'dark'
      sessionStorage.setItem('playground-dark', dark)
      document.documentElement.classList.toggle('dark', dark)
    }
  });
  window.parent.postMessage({ source: 'nuxt-playground-color-mode-request' }, '*');

  const es = new EventSource('/__reload');
  es.onmessage = () => location.reload();
<\/script>`

const clients = new Set()

const watcher = watch('.', { recursive: true })
;(async () => {
  for await (const event of watcher) {
    if (event.filename?.endsWith('.html') || event.filename?.endsWith('.js') || event.filename?.endsWith('.css')) {
      for (const res of clients) {
        res.write('data: reload\n\n')
      }
    }
  }
})()

createServer(async (req, res) => {
  if (req.url === '/__reload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })
    clients.add(res)
    req.on('close', () => clients.delete(res))
    return
  }

  try {
    const url = new URL(req.url, 'http://localhost')
    const isDark = url.searchParams.get('dark') === 'true'
    const pathname = url.pathname

    const file = pathname === '/' ? '/index.html' : pathname
    const mime = MIME[extname(file)] ?? 'text/plain'
    let content = await readFile(`.${file}`, 'utf-8')

    if (mime === 'text/html') {
      if (isDark) {
        if (content.includes('<html')) {
          content = content.includes('class="')
            ? content.replace('class="', 'class="dark ')
            : content.replace('<html', '<html class="dark"')
        }
        else {
          content = `<html class="dark">${content}`
        }
      }

      content = content.includes('<head>')
        ? content.replace('<head>', `<head>${INJECTED_SCRIPT_BLOCKING}`)
        : INJECTED_SCRIPT_BLOCKING + content

      content = content.includes('</head>')
        ? content.replace('</head>', `${INJECTED_STYLE}${INJECTED_SCRIPT}</head>`)
        : content + INJECTED_STYLE + INJECTED_SCRIPT
    }

    res.writeHead(200, { 'Content-Type': mime })
    res.end(content)
  }
  catch {
    res.writeHead(404)
    res.end('Not found')
  }
}).listen(5173, '0.0.0.0')
