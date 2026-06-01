import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript'

export function createOnigurumaEngine(_wasmLoader) {
  return createJavaScriptRegexEngine()
}

export async function loadWasm() {}
export function getDefaultWasmLoader() {}
export function setDefaultWasmLoader() {}
