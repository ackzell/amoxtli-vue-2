import { CONSOLE_INTERCEPTOR_CODE } from '~/templates/console-interceptor'

const themeColors = {
  light: { bg: '#fafafa', fg: '#101010' },
  dark: { bg: '#101010', fg: '#fafafa' },
}

const ERROR_OVERLAY_CODE = `
(function() {
  function renderError(message, stack) {
    var pre = document.createElement('pre')
    pre.style.cssText = 'position:fixed;left:0;right:0;bottom:0;margin:0;padding:8px 12px;' +
      'font-size:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;' +
      'color:#f87171;background:rgba(17,17,17,0.9);white-space:pre-wrap;word-wrap:break-word;' +
      'z-index:9999;border-top:1px solid rgba(255,255,255,0.15)'
    pre.textContent = message + (stack ? '\\n' + stack.split('\\n').slice(0, 5).join('\\n') : '')
    document.body.appendChild(pre)
  }
  window.addEventListener('error', function (event) {
    var e = event.error || event.message
    renderError(e && e.message ? e.message : String(e), e && e.stack)
  })
  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason
    renderError(
      'Unhandled Promise: ' + (reason && reason.message ? reason.message : String(reason)),
      reason && reason.stack
    )
  })
})()
`

export function useHtmlSandboxPreview() {
  const iframeEl = ref<HTMLIFrameElement | null>(null)

  function extractInlineScripts(source: string): { markup: string, scripts: string } {
    const scripts: string[] = []
    const markup = source.replace(
      /<script(?:\s[^>]*)?>[\s\S]*?<\/script>|<script(?:\s[^>]*)?\/>/gi,
      (block) => {
        scripts.push(block)
        return ''
      },
    )
    return { markup, scripts: scripts.join('\n') }
  }

  function renderHtml(html: string, isDark = false): string {
    const t = isDark ? themeColors.dark : themeColors.light
    const { markup, scripts } = extractInlineScripts(html)
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    html { background: ${t.bg}; }
    body { margin: 0; padding: 16px; font-family: -apple-system, sans-serif; color: ${t.fg}; }
  </style>
</head>
<body>
  <script>${CONSOLE_INTERCEPTOR_CODE}<\/script>
  <script>${ERROR_OVERLAY_CODE}<\/script>
  ${markup}
  ${scripts}
</body>
</html>`
  }

  function render(html: string, isDark = false) {
    if (!iframeEl.value)
      return
    iframeEl.value.srcdoc = renderHtml(html, isDark)
  }

  return {
    iframeEl,
    renderHtml,
    render,
  }
}
