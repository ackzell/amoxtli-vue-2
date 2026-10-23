import type { VirtualFile } from '~/structures/VirtualFile'
import { describe, expect, it } from 'vitest'
import { virtualFsToTreeNodes } from './virtualFsToTreeNodes'

function fakeFile(filepath: string) {
  return { filepath } as VirtualFile
}

describe('virtualFsToTreeNodes', () => {
  it('builds nested nodes with full paths', () => {
    const nodes = virtualFsToTreeNodes({
      'app': {
        directory: {
          'app.vue': { file: fakeFile('app/app.vue') },
        },
      },
      'package.json': { file: fakeFile('package.json') },
    })

    expect(nodes).toHaveLength(2)
    expect(nodes[0]).toMatchObject({
      name: 'app',
      path: 'app',
      children: [{ name: 'app.vue', path: 'app/app.vue' }],
    })
    expect(nodes[1]).toMatchObject({ name: 'package.json', path: 'package.json' })
  })

  it('sorts directories before files, each alphabetically', () => {
    const nodes = virtualFsToTreeNodes({
      'z-file.ts': { file: fakeFile('z-file.ts') },
      'a-file.ts': { file: fakeFile('a-file.ts') },
      'z-dir': { directory: { 'nested.ts': { file: fakeFile('z-dir/nested.ts') } } },
      'a-dir': { directory: { 'nested.ts': { file: fakeFile('a-dir/nested.ts') } } },
    })

    expect(nodes.map(node => node.name)).toEqual([
      'a-dir',
      'z-dir',
      'a-file.ts',
      'z-file.ts',
    ])
  })

  it('keeps the VirtualFile reference for selection', () => {
    const file = fakeFile('main.ts')
    const nodes = virtualFsToTreeNodes({ 'main.ts': { file } })

    expect(nodes[0]?.file).toBe(file)
  })
})
