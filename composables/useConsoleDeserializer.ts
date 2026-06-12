/**
 * Shared console message deserializer for Luna Console.
 *
 * Lossless deserialization:
 * - Recreates primitives as-is
 * - Returns enriched objects for complex types (with __type metadata)
 * - Keeps outerHTML, function source, accessor info, etc.
 * - Detects Vue reactive/ref objects and labels them as Proxy(Object)
 */
export function useConsoleDeserializer(toEl?: any) {
  function deserializeMessage(arg: any): any {
    if (arg === null || arg === undefined)
      return arg
    if (typeof arg !== 'object' || !arg.__type)
      return arg

    switch (arg.__type) {
      case 'undefined':
        return undefined

      case 'function': {
        const fn = function () {}
        const functionName = arg.name || 'anonymous'
        const preview = arg.isNative
          ? `function ${functionName}() { [native code] }`
          : `function ${functionName}() { /* source unavailable */ }`
        Object.defineProperty(fn, 'toString', {
          value: () => preview,
          enumerable: false,
          configurable: true,
        })
        ;(fn as any).__isStub = true
        ;(fn as any).__preview = preview
        return fn
      }

      case 'symbol':
        return Symbol(arg.description ?? '')

      case 'bigint':
        try {
          return BigInt(arg.value)
        }
        catch {
          return new Object(`BigInt(${arg.value})`)
        }

      case 'date':
        return arg.invalid ? new Date('Invalid Date') : new Date(arg.value).toString()

      case 'regexp':
        return new RegExp(arg.source, arg.flags)

      case 'error': {
        const e = new Error(arg.message)
        e.name = arg.name
        ;(e as any).stack = arg.stack
        return e
      }

      case 'dom': {
        if (arg.outerHTML && toEl) {
          const el = toEl(arg.outerHTML)
          Object.defineProperty(el, '__preview', {
            value: arg.outerHTML.replace(/\n/g, ''),
            enumerable: false,
          })
          return el
        }
        if (arg.nodeType === 3 && arg.textContent)
          return document.createTextNode(arg.textContent)
        return `[DOM ${arg.tagName || 'Unknown'}]`
      }

      case 'vue_component':
        return `[VueComponent ${arg.name}]`

      case 'array': {
        const items = arg.items?.map(deserializeMessage) ?? []
        if (arg.truncated)
          items.push(`...and ${arg.truncated} more items`)
        return items
      }

      case 'object': {
        const out: Record<string, any> = {}
        for (const key in arg.properties) {
          const prop = arg.properties[key]
          if (prop && 'value' in prop)
            out[key] = deserializeMessage(prop.value)
        }
        if (arg.truncatedProperties) {
          out.__truncated__ = `${arg.truncatedProperties} more properties`
        }

        if (arg.constructor && arg.constructor === 'Reactive') {
          Object.defineProperty(out, 'constructor', {
            value: { name: 'Proxy(Object)' },
            writable: false,
            enumerable: false,
            configurable: true,
          })

          // Fake Proxy internals to match Chrome DevTools output
          Object.defineProperty(out, '[[Target]]', {
            value: { ...out },
            enumerable: false,
            configurable: true,
          })

          const handlerName = arg.reactiveInfo?.handlerName || 'MutableReactiveHandler'
          function HandlerCtor() {}
          Object.defineProperty(HandlerCtor, 'name', { value: handlerName })
          const handler = Object.create(HandlerCtor.prototype)
          Object.defineProperty(handler, Symbol.toStringTag, {
            value: handlerName,
            enumerable: false,
            configurable: true,
          })
          handler._isReadonly = arg.reactiveInfo?.isReadonly ?? false
          handler._isShallow = arg.reactiveInfo?.isShallow ?? false
          Object.defineProperty(out, '[[Handler]]', {
            value: handler,
            enumerable: false,
            configurable: true,
          })

          Object.defineProperty(out, '[[IsRevoked]]', {
            value: false,
            enumerable: false,
            configurable: true,
          })

          return out
        }
        else if (arg.constructor && arg.constructor !== 'Object') {
          function NamedCtor() {}
          const label = arg.constructor === 'Ref' || arg.constructor === 'RefImpl' ? 'RefImpl' : arg.constructor
          Object.defineProperty(NamedCtor, 'name', { value: label })
          Object.setPrototypeOf(out, NamedCtor.prototype)

          Object.defineProperty(out, 'value', {
            value: out._rawValue,
            enumerable: false,
            configurable: true,
          })
        }
        else {
          Object.defineProperty(out, 'toString', {
            value: () => '[Object]',
            enumerable: false,
          })
        }

        return out
      }

      case 'circular':
        return `[Circular ${arg.path ?? ''}]`

      case 'accessor':
        return `[Getter/Setter]`

      default:
        return `[Unrecognized ${arg.__type}]`
    }
  }

  return { deserializeMessage }
}
