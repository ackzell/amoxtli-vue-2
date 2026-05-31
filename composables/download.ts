import type { WebContainer } from '@webcontainer/api'
import type { StringOrRegExp } from '~/types/guides'
import { isBinaryFile } from '~/lib/binary'

export async function downloadZip(wc: WebContainer, ignoredFiles?: StringOrRegExp[]) {
  if (!import.meta.client)
    return

  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()

  type Zip = typeof zip
  const crawlFiles = async (dir: string, zip: Zip) => {
    const files = await wc.fs.readdir(dir, { withFileTypes: true })

    await Promise.all(
      files.map(async (file) => {
        if (isFileIgnored(file.name, ignoredFiles))
          return

        if (file.isFile()) {
          // TODO: If it's package.json, we modify to remove some fields
          const filepath = `${dir}/${file.name}`
          if (isBinaryFile(filepath)) {
            const buffer = await wc.fs.readFile(filepath)
            zip.file(file.name, buffer)
          }
          else {
            const content = await wc.fs.readFile(filepath, 'utf8')
            zip.file(file.name, content)
          }
        }
        else if (file.isDirectory()) {
          const folder = zip.folder(file.name)!
          return crawlFiles(`${dir}/${file.name}`, folder)
        }
      }),
    )
  }

  await crawlFiles('.', zip)

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const date = new Date()
  const dateString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`
  const link = document.createElement('a')
  link.href = url
  // TODO: have a better name with the current tutorial name
  link.download = `nuxt-playground-${dateString}.zip`
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
