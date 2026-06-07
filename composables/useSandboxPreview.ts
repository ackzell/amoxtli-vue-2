import { useVueRuntime } from './useVueRuntime'
import { CONSOLE_INTERCEPTOR_CODE } from '~/templates/console-interceptor'

const themeColors = {
  light: { bg: '#fafafa', fg: '#101010' },
  dark: { bg: '#101010', fg: '#fafafa' },
}

export function useSandboxPreview() {
  const iframeEl = ref<HTMLIFrameElement | null>(null)
  const { vueVersion, blobUrl, loading, error: runtimeError } = useVueRuntime()
  const compileError = ref<string | null>(null)

  function buildHtml(js: string, css: string, isDark: boolean, showConsole = false): string {
    const t = isDark ? themeColors.dark : themeColors.light
    const consoleScript = showConsole
      ? `<script>${CONSOLE_INTERCEPTOR_CODE}<\/script>`
      : ''
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    html { background: ${t.bg}; }
    body { margin: 0; padding: 16px; font-family: -apple-system, sans-serif; color: ${t.fg}; }
    ${css}
  </style>
</head>
<body>
  <div id="app"></div>
  <script src="${blobUrl.value}"><\/script>
  ${consoleScript}
  <script>
    try {
      var comp = ${js}
      var app = Vue.createApp(comp)
      app.mount('#app')
    } catch(e) {
      document.body.innerHTML = '<pre style="color:red;padding:8px;margin:0;font-size:13px;overflow:auto;">' +
        e.toString() + (e.stack ? '\\n\\n' + e.stack.split('\\n').slice(0,6).join('\\n') : '') +
        '<\/pre>'
    }
  <\/script>
</body>
</html>`
  }

  function render(js: string, css: string, isDark = false, showConsole = false) {
    compileError.value = null
    if (!iframeEl.value)
      return
    if (!blobUrl.value) {
      iframeEl.value.srcdoc = '<html><body><p style="padding:16px;color:#888;">Loading Vue runtime...</p></body></html>'
      return
    }
    iframeEl.value.srcdoc = buildHtml(js, css, isDark, showConsole)
  }

  function showError(message: string, css = '', isDark = false) {
    const t = isDark ? themeColors.dark : themeColors.light
    compileError.value = message
    if (iframeEl.value) {
      iframeEl.value.srcdoc = `
        <html>
          <head>
            <style>
              html { background: ${t.bg}; }
              body { margin: 0; padding: 16px; font-family: -apple-system, sans-serif; color: ${t.fg}; }
              ${css}
            </style>
          </head>
          <body>
            <pre style="color:red;padding:16px;margin:0;font-size:13px;white-space: pre-wrap;word-wrap: break-word;">${message}</pre>
          </body>
        </html>`
    }
  }

  return {
    iframeEl,
    compileError,
    runtimeError,
    vueVersion,
    blobUrl,
    loading,
    render,
    showError,
  }
}
