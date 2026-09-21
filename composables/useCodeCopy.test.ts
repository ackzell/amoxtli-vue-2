import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { useCodeCopy } from './useCodeCopy'

let copy: ReturnType<typeof vi.fn>

beforeEach(() => {
  copy = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('useClipboard', () => ({ copy }))
  vi.stubGlobal('ref', ref)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('useCodeCopy', () => {
  it('short-circuits on empty content without touching the clipboard', async () => {
    const { copied, copyCode } = useCodeCopy()
    await copyCode('')
    expect(copy).not.toHaveBeenCalled()
    expect(copied.value).toBe(false)
  })

  it('copies non-empty content and flips the copied flag for 1200ms', async () => {
    const { copied, copyCode } = useCodeCopy()
    await copyCode('const x = 1')
    expect(copy).toHaveBeenCalledWith('const x = 1')
    expect(copied.value).toBe(true)

    vi.advanceTimersByTime(1199)
    expect(copied.value).toBe(true)

    vi.advanceTimersByTime(1)
    expect(copied.value).toBe(false)
  })

  it('a failed clipboard write leaves the copied flag off', async () => {
    copy.mockRejectedValueOnce(new Error('clipboard blocked'))
    const { copied, copyCode } = useCodeCopy()
    await expect(copyCode('abc')).rejects.toThrow('clipboard blocked')
    expect(copied.value).toBe(false)
  })
})
