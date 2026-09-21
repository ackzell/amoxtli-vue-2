import { describe, expect, it } from 'vitest'

import { computeDiff } from './diff'

function rowShape(r: { type: string, text: string, oldNo: number | null, newNo: number | null }) {
  return { type: r.type, text: r.text, oldNo: r.oldNo, newNo: r.newNo }
}

describe('computeDiff — equal content', () => {
  it('emits one equal group per unchanged line', () => {
    const { groups } = computeDiff('a\nb', 'a\nb')
    expect(groups).toHaveLength(2)
    expect(groups[0]!.kind).toBe('equal')
    expect(rowShape(groups[0]!.row!)).toEqual({ type: 'equal', text: 'a', oldNo: 1, newNo: 1 })
    expect(rowShape(groups[1]!.row!)).toEqual({ type: 'equal', text: 'b', oldNo: 2, newNo: 2 })
    expect(groups.every(g => g.left.length === 0 && g.right.length === 0)).toBe(true)
  })

  it('pins the current spurious hunk when only a trailing newline differs', () => {
    const { groups } = computeDiff('a\nb', 'a\nb\n')
    expect(groups).toHaveLength(2)
    expect(groups[0]!.kind).toBe('equal')
    expect(groups[1]!.kind).toBe('change')
    expect(rowShape(groups[1]!.left[0]!)).toEqual({ type: 'remove', text: 'b', oldNo: 2, newNo: null })
    expect(rowShape(groups[1]!.right[0]!)).toEqual({ type: 'add', text: 'b', oldNo: null, newNo: 2 })
  })
})

describe('computeDiff — additions and removals', () => {
  it('treats a no-newline base as one change hunk (jsdiff trailing-newline semantics)', () => {
    const { groups } = computeDiff('a', 'a\nb\nc')
    expect(groups).toHaveLength(1)
    const change = groups[0]!
    expect(change.kind).toBe('change')
    expect(change.left.map(rowShape)).toEqual([
      { type: 'remove', text: 'a', oldNo: 1, newNo: null },
    ])
    expect(change.right.map(rowShape)).toEqual([
      { type: 'add', text: 'a', oldNo: null, newNo: 1 },
      { type: 'add', text: 'b', oldNo: null, newNo: 2 },
      { type: 'add', text: 'c', oldNo: null, newNo: 3 },
    ])
  })

  it('groups removed lines as a change hunk with only left rows', () => {
    const { groups } = computeDiff('a\nb\n', 'a\n')
    expect(groups[0]!.kind).toBe('equal')
    const change = groups[1]!
    expect(change.kind).toBe('change')
    expect(change.right).toEqual([])
    expect(change.left.map(rowShape)).toEqual([
      { type: 'remove', text: 'b', oldNo: 2, newNo: null },
    ])
  })
})

describe('computeDiff — word-level ranges', () => {
  it('marks the changed token on both sides of a paired edit', () => {
    const { groups } = computeDiff('const x = 1', 'const x = 2')
    const change = groups[0]!
    expect(change.kind).toBe('change')
    expect(change.left.map(rowShape)).toEqual([
      { type: 'remove', text: 'const x = 1', oldNo: 1, newNo: null },
    ])
    expect(change.right.map(rowShape)).toEqual([
      { type: 'add', text: 'const x = 2', oldNo: null, newNo: 1 },
    ])
    expect(change.left[0]!.ranges).toEqual([{ start: 10, end: 11 }])
    expect(change.right[0]!.ranges).toEqual([{ start: 10, end: 11 }])
  })

  it('drops whitespace-only segments from the word diff (indent-only change)', () => {
    const { groups } = computeDiff('  x', 'x')
    const change = groups[0]!
    expect(change.kind).toBe('change')
    expect(change.left[0]!.ranges).toEqual([])
    expect(change.right[0]!.ranges).toEqual([])
  })

  it('tracks multiple changed tokens in one line', () => {
    const { groups } = computeDiff('foo bar', 'foo qux')
    const change = groups[0]!
    expect(change.left[0]!.ranges).toEqual([{ start: 4, end: 7 }])
    expect(change.right[0]!.ranges).toEqual([{ start: 4, end: 7 }])
  })
})

describe('computeDiff — multiple hunks', () => {
  it('keeps equal rows between change hunks', () => {
    const { groups } = computeDiff('a\nb\nc\nd', 'a\nB\nc\nd')
    expect(groups.map(g => g.kind)).toEqual(['equal', 'change', 'equal', 'equal'])
    expect(rowShape(groups[1]!.left[0]!)).toEqual({ type: 'remove', text: 'b', oldNo: 2, newNo: null })
    expect(rowShape(groups[1]!.right[0]!)).toEqual({ type: 'add', text: 'B', oldNo: null, newNo: 2 })
  })

  it('handles empty inputs', () => {
    expect(computeDiff('', '').groups).toEqual([])
    expect(computeDiff('', 'x').groups[0]!.right[0]!.text).toBe('x')
  })
})
