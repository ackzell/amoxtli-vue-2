import type { VirtualFile } from '~/structures/VirtualFile'
import type { VirtualFileSystemTree } from '~/structures/VirtualFileSystemTree'

/**
 * Node shape consumed by `@calmecac-vue/playground-layout`'s `FileTree`.
 * `file` is kept on the node so selection maps straight back to the
 * playground store's `VirtualFile` without a second lookup.
 */
export interface EditorTreeNode {
  path: string
  name: string
  file?: VirtualFile
  children?: EditorTreeNode[]
}

/**
 * Convert the playground's nested `VirtualFileSystemTree` into the shared
 * file-tree node shape, sorting folders before files (both alphabetically).
 */
export function virtualFsToTreeNodes(
  tree: VirtualFileSystemTree,
  parentPath = '',
): EditorTreeNode[] {
  return Object.entries(tree)
    .sort(([aName, aNode], [bName, bNode]) => {
      const aIsDirectory = 'directory' in aNode
      const bIsDirectory = 'directory' in bNode
      if (aIsDirectory !== bIsDirectory)
        return aIsDirectory ? -1 : 1
      return aName.localeCompare(bName)
    })
    .map(([name, node]) => {
      const path = parentPath ? `${parentPath}/${name}` : name
      if ('directory' in node)
        return { path, name, children: virtualFsToTreeNodes(node.directory, path) }
      return { path, name, file: node.file }
    })
}
