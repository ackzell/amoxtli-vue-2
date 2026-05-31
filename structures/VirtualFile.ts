import type { FileNode, WebContainer } from '@webcontainer/api'
import { dirname } from 'pathe'
import { isBinaryFile } from '~/lib/binary'

export class VirtualFile {
  /**
   * Optional transform applied when writing to WebContainer FS.
   * Used to inject scripts (e.g. console interceptor) into HTML files
   * without polluting the editor content.
   */
  fsTransform?: (content: string) => string

  constructor(
    public readonly filepath: string,
    private _content: string,
    public wc: WebContainer,
  ) {
  }

  toNode(): FileNode {
    // eslint-disable-next-line ts/no-this-alias
    const self = this
    return {
      file: {
        get contents() {
          if (isBinaryFile(self.filepath))
            return Uint8Array.from(atob(self._content), c => c.charCodeAt(0))
          return self.fsTransform ? self.fsTransform(self._content) : self._content
        },
      },
    }
  }

  read() {
    return this._content
  }

  async write(content: string) {
    this._content = content
    await this.wc.fs.mkdir(dirname(this.filepath), { recursive: true })
    if (isBinaryFile(this.filepath)) {
      const binary = Uint8Array.from(atob(content), c => c.charCodeAt(0))
      await this.wc.fs.writeFile(this.filepath, binary)
    }
    else {
      const fsContent = this.fsTransform ? this.fsTransform(content) : content
      await this.wc.fs.writeFile(this.filepath, fsContent, 'utf-8')
    }
  }

  async remove() {
    await this.wc.fs.rm(this.filepath)
  }
}
