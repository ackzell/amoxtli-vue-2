// Universal console interceptor for any framework
// This file gets injected into all playground templates

export const CONSOLE_INTERCEPTOR_CODE = `
// Console interceptor - automatically injected by playground
/* console-interceptor */
(function() {
  if (window.__consoleInterceptorInstalled)
    return;
  window.__consoleInterceptorInstalled = true;

  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug,
    table: console.table,
    dir: console.dir,
  };

  function serializeArg(arg, seen = new WeakSet()) {
    if (arg === null) return null;
    if (arg === undefined) return { __type: 'undefined' };

    const type = typeof arg;

    if (type === 'string' || type === 'number' || type === 'boolean') {
      return arg;
    }

    if (type === 'function') {
      return {
        __type: 'function',
        name: arg.name || 'anonymous',
        isNative: arg.toString().includes('[native code]'),
      };
    }

    if (type === 'symbol') {
      return {
        __type: 'symbol',
        description: arg.description,
      };
    }

    if (type === 'bigint') {
      return {
        __type: 'bigint',
        value: arg.toString(),
      };
    }

    if (typeof arg === 'object' && seen.has(arg)) {
      return { __type: 'circular' };
    }

    if (typeof arg === 'object') {
      seen.add(arg);
    }

    if (arg instanceof Error) {
      return {
        __type: 'error',
        name: arg.name,
        message: arg.message,
        stack: arg.stack,
      };
    }

    if (arg instanceof Date) {
      return {
        __type: 'date',
        value: arg.toISOString(),
        invalid: isNaN(arg.getTime()),
      };
    }

    if (arg instanceof RegExp) {
      return {
        __type: 'regexp',
        source: arg.source,
        flags: arg.flags,
      };
    }

    if (Array.isArray(arg)) {
      return {
        __type: 'array',
        items: arg.slice(0, 100).map(item => serializeArg(item, seen)),
        truncated: arg.length > 100 ? arg.length - 100 : undefined,
      };
    }

    if (typeof Element !== 'undefined' && arg instanceof Element) {
      return {
        __type: 'dom',
        tagName: arg.tagName,
        nodeType: arg.nodeType,
        outerHTML: arg.outerHTML?.slice(0, 500),
      };
    }

    if (typeof Node !== 'undefined' && arg instanceof Node) {
      return {
        __type: 'dom',
        nodeType: arg.nodeType,
        textContent: arg.textContent?.slice(0, 100),
      };
    }

    if ((window.Vue?.isReactive?.(arg)) || arg?.__v_isReactive === true) {
      const keys = Object.keys(arg).slice(0, 50);
      const properties = {};
      for (const key of keys) {
        try { properties[key] = { value: serializeArg(arg[key], seen) }; }
        catch { properties[key] = { value: '[Error accessing property]' }; }
      }
      const isReadonly = arg.__v_isReadonly === true;
      const isShallow = arg.__v_isShallow === true;
      let handlerName = 'MutableReactiveHandler';
      if (isReadonly && isShallow) handlerName = 'ShallowReadonlyReactiveHandler';
      else if (isReadonly) handlerName = 'ReadonlyReactiveHandler';
      else if (isShallow) handlerName = 'ShallowReactiveHandler';
      return { 
        __type: 'object', 
        constructor: 'Reactive',
        properties,
        reactiveInfo: { handlerName, isReadonly, isShallow },
      };
    }

    if (arg?.__v_isRef === true) {
      const keys = Object.keys(arg).slice(0, 50);
      const properties = {};
      for (const key of keys) {
        try { properties[key] = { value: serializeArg(arg[key], seen) }; }
        catch { properties[key] = { value: '[Error accessing property]' }; }
      }
      return {
        __type: 'object',
        constructor: 'Ref',
        properties,
        truncatedProperties: Object.keys(arg).length > 50 ? Object.keys(arg).length - 50 : undefined,
      };
    }

    try {
      const properties = {};
      const keys = Object.keys(arg).slice(0, 50);
      for (const key of keys) {
        try {
          properties[key] = { value: serializeArg(arg[key], seen) };
        } catch (e) {
          properties[key] = { value: '[Error accessing property]' };
        }
      }
      return {
        __type: 'object',
        constructor: arg.constructor?.name || 'Object',
        properties,
        truncatedProperties: Object.keys(arg).length > 50 ? Object.keys(arg).length - 50 : undefined,
      };
    } catch (e) {
      return { __type: 'object', constructor: 'Object', properties: {} };
    }
  }

  function sendConsoleToParent(level, ...args) {
    if (!window.parent) return;
    window.parent.postMessage(
      {
        source: 'nuxt-playground-frame',
        payload: {
          method: 'onConsoleLog',
          args: [{
            logLevel: level,
            data: args.map(arg => serializeArg(arg)),
          }],
        },
      },
      '*'
    );
  }

  function interceptConsole(level) {
    console[level] = function (...args) {
      originalConsole[level].apply(console, args);
      sendConsoleToParent(level, ...args);
    };
  }

  // Intercept all console methods
  ['log', 'warn', 'error', 'info', 'debug', 'table', 'dir'].forEach(interceptConsole);

  // Handle unhandled errors
  window.addEventListener('error', (event) => {
    console.error(event.error || event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise:', event.reason);
  });
})();
`
