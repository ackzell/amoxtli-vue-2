import type { FileNode, WebContainer } from '@webcontainer/api'
import { dirname } from 'pathe'

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
    const fsContent = this.fsTransform ? this.fsTransform(content) : content
    await this.wc.fs.mkdir(dirname(this.filepath), { recursive: true })
    await this.wc.fs.writeFile(this.filepath, fsContent, 'utf-8')
  }

  async remove() {
    await this.wc.fs.rm(this.filepath)
  }
}
