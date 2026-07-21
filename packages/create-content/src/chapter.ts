import type { Locale } from './utils'
import { createLesson, TEMPLATE_OPTIONS } from './lesson'
import {
  getChapterIndexMd,
  getChapters,
  getContentDir,
  getLocales,
  getNextNumber,

  padNumber,
  slugify,
} from './utils'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { confirm, isCancel, select, spinner, text } from '@clack/prompts'
import { red } from 'kolorist'

export async function createChapter() {
  const locales = getLocales()
  const locale = locales.length === 1
    ? locales[0]
    : await select({
        message: 'Locale:',
        options: locales.map(l => ({ value: l, label: l })),
      })

  if (isCancel(locale))
    return

  const chapters = getChapters(locale)
  const nextNum = getNextNumber(join(getContentDir(), locale))

  const title = await text({
    message: 'Chapter title:',
    validate: (v) => {
      if (!v)
        return 'Required'
      if (slugify(v).length === 0)
        return 'Title must contain at least one letter or number'
    },
  })

  if (isCancel(title))
    return

  const numStr = await text({
    message: 'Chapter number:',
    initialValue: String(nextNum),
    validate: (v) => {
      const n = Number(v)
      if (!Number.isInteger(n) || n < 0)
        return 'Must be a positive integer'
      if (chapters.some(c => c.num === n))
        return `Chapter ${padNumber(n)} already exists`
    },
  })

  if (isCancel(numStr))
    return

  const num = Number(numStr)
  const slug = slugify(title)
  const dirName = `${padNumber(num)}.${slug}`
  const chapterDir = join(getContentDir(), locale, dirName)

  const s = spinner()
  s.start('Creating chapter...')

  mkdirSync(chapterDir, { recursive: true })
  writeFileSync(join(chapterDir, `${padNumber(num)}.index.md`), getChapterIndexMd(title))

  s.stop(`Created chapter: ${locale}/${dirName}/`)

  const addLessons = await confirm({ message: 'Add lessons to this chapter?' })
  if (isCancel(addLessons))
    return

  if (addLessons) {
    const template = await select({
      message: 'Template type for all lessons:',
      options: [...TEMPLATE_OPTIONS],
    })
    if (isCancel(template))
      return

    let lessonNum = 1
    while (true) {
      const lessonTitle = await text({
        message: `Lesson ${lessonNum} title (empty to finish):`,
      })

      if (isCancel(lessonTitle))
        return
      if (!lessonTitle)
        break

      await createLesson({
        locale: locale as Locale,
        chapterDir: dirName,
        title: lessonTitle,
        template,
      })
      lessonNum++
    }
  }
}

export async function createChapterWizard() {
  try {
    await createChapter()
  }
  catch (e) {
    console.error(red(String(e)))
  }
}
