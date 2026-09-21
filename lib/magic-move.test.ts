// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'

import { containerStepFromKey, getStepCode, tablistStepFromKey } from './magic-move'

function makePre(lines: string[]): Element {
  const pre = document.createElement('pre')
  const code = document.createElement('code')
  for (const line of lines) {
    const span = document.createElement('span')
    span.className = 'line'
    span.textContent = line
    code.appendChild(span)
  }
  pre.appendChild(code)
  return pre
}

describe('magic-move — getStepCode', () => {
  it('joins .line spans with newlines', () => {
    const pre = makePre(['const a = 1', 'const b = 2'])
    expect(getStepCode(pre)).toBe('const a = 1\nconst b = 2')
  })

  it('falls back to raw code text when there are no .line spans', () => {
    const pre = document.createElement('pre')
    const code = document.createElement('code')
    code.textContent = 'const x = 1\n'
    pre.appendChild(code)
    expect(getStepCode(pre)).toBe('const x = 1')
  })

  it('returns an empty string without a code element', () => {
    const pre = document.createElement('pre')
    expect(getStepCode(pre)).toBe('')
  })

  it('strips a trailing newline from each line span', () => {
    const pre = document.createElement('pre')
    const code = document.createElement('code')
    for (const text of ['a\n', 'b\n']) {
      const span = document.createElement('span')
      span.className = 'line'
      span.textContent = text
      code.appendChild(span)
    }
    pre.appendChild(code)
    expect(getStepCode(pre)).toBe('a\nb')
  })
})

describe('magic-move — container keyboard', () => {
  it('steps right/down/pagedown without passing the last step', () => {
    expect(containerStepFromKey('ArrowRight', 0, 2)).toBe(1)
    expect(containerStepFromKey('ArrowDown', 2, 2)).toBe(2)
    expect(containerStepFromKey('PageDown', 1, 2)).toBe(2)
  })

  it('steps left/up/pageup without passing the first step', () => {
    expect(containerStepFromKey('ArrowLeft', 2, 2)).toBe(1)
    expect(containerStepFromKey('ArrowUp', 0, 2)).toBe(0)
    expect(containerStepFromKey('PageUp', 2, 2)).toBe(1)
  })

  it('maps digit keys to 0-based steps, clamped to the last', () => {
    expect(containerStepFromKey('3', 0, 4)).toBe(2)
    expect(containerStepFromKey('9', 0, 2)).toBe(2)
  })

  it('ignores non-navigation keys', () => {
    expect(containerStepFromKey('a', 0, 2)).toBeUndefined()
    expect(containerStepFromKey('0', 0, 2)).toBeUndefined()
    expect(containerStepFromKey('Enter', 0, 2)).toBeUndefined()
  })
})

describe('magic-move — tablist keyboard', () => {
  it('wraps right/down and left/up around the step count', () => {
    expect(tablistStepFromKey('ArrowRight', 2, 3)).toBe(0)
    expect(tablistStepFromKey('ArrowDown', 2, 3)).toBe(0)
    expect(tablistStepFromKey('ArrowLeft', 0, 3)).toBe(2)
    expect(tablistStepFromKey('ArrowUp', 0, 3)).toBe(2)
  })

  it('jumps to first and last via Home/End', () => {
    expect(tablistStepFromKey('Home', 2, 3)).toBe(0)
    expect(tablistStepFromKey('End', 0, 3)).toBe(2)
  })

  it('returns undefined for zero steps or non-navigation keys', () => {
    expect(tablistStepFromKey('ArrowRight', 0, 0)).toBeUndefined()
    expect(tablistStepFromKey('a', 0, 3)).toBeUndefined()
  })
})
