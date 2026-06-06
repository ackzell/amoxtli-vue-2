import { useVueRuntime } from './useVueRuntime'

const themeColors = {
  light: { bg: '#ffffff', fg: '#1a1a1a' },
  dark: { bg: '#1a1a1a', fg: '#e4e4e4' },
}

export function useSandboxPreview() {
  const iframeEl = ref<HTMLIFrameElement | null>(null)
  const { vueVersion, blobUrl, loading, error: runtimeError } = useVueRuntime()
  const compileError = ref<string | null>(null)

  function buildHtml(js: string, css: string, isDark: boolean): string {
    const t = isDark ? themeColors.dark : themeColors.light
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

  function render(js: string, css: string, isDark = false) {
    compileError.value = null
    if (!iframeEl.value)
      return
    if (!blobUrl.value) {
      iframeEl.value.srcdoc = '<html><body><p style="padding:16px;color:#888;">Loading Vue runtime...</p></body></html>'
      return
    }
    iframeEl.value.srcdoc = buildHtml(js, css, isDark)
  }

  function showError(message: string) {
    compileError.value = message
    if (iframeEl.value) {
      iframeEl.value.srcdoc = `<html><body><pre style="color:red;padding:16px;margin:0;font-size:13px;overflow:auto;">${message}</pre></body></html>`
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
