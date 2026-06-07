const setupConnectSource = `
function setupConnect(options) {
  options = options || {};
  var currentURL = new URL(window.location.href);
  if (!currentURL.pathname.startsWith('/webcontainer/connect/')) {
    throw new Error('This function must be used on a /webcontainer/connect endpoint.');
  }
  if (!window.opener) {
    throw new Error('This page must have an opener. You must serve it with appropriate headers');
  }
  var editorOrigin = new URL(options.editorOrigin || 'https://stackblitz.com');
  editorOrigin.pathname = currentURL.pathname;
  var iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  window.addEventListener('message', function(event) {
    if (event.data === 'close') { window.close(); return; }
    var transferables = findMessagePorts(event.data);
    if (event.source === window.opener) {
      iframe.contentWindow.postMessage(event.data, '*', transferables);
    } else {
      window.opener.postMessage(event.data, '*', transferables);
    }
  });
  iframe.src = editorOrigin.toString();
  document.body.appendChild(iframe);
}
function findMessagePorts(data) {
  if (!data || typeof data !== 'object') return [];
  var result = [];
  for (var key in data) {
    var value = data[key];
    if (Object.prototype.toString.call(value) === '[object MessagePort]') {
      result.push(value);
      continue;
    }
    result.push.apply(result, findMessagePorts(value));
  }
  return result;
}
`

export default defineEventHandler(async (event) => {
  setHeader(event, 'Content-Type', 'text/html')
  return `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n<title>Connecting preview...</title>\n</head>\n<body>\n<script>\n${setupConnectSource}\nsetupConnect();\n</script>\n</body>\n</html>`
})
