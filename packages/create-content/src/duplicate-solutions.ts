import { join } from 'node:path'
import { autocomplete, confirm, isCancel, select, spinner } from '@clack/prompts'
import { green, red } from 'kolorist'
import {
  copyDir,
  countFiles,
  getAllLessonsFlat,
  getContentDir,
  getLocales,
  hasFilesDir,
  hasTemplateDir,
} from './utils'

export async function duplicateSolutions() {
  const locales = getLocales()
  const locale = locales.length === 1
    ? locales[0]
    : await select({
        message: 'Locale:',
        options: locales.map(l => ({ value: l, label: l })),
      })

  if (isCancel(locale))
    return

  const lessons = getAllLessonsFlat(locale)
  if (lessons.length === 0) {
    console.error(red('No lessons found'))
    return
  }

  const selected = await autocomplete({
    message: 'Select a lesson:',
    options: lessons,
  })

  if (isCancel(selected))
    return

  const lessonPath = join(getContentDir(), locale, selected as string)

  if (!hasTemplateDir(lessonPath)) {
    console.error(red(`No .template/ directory found in ${selected}`))
    return
  }

  if (!hasFilesDir(lessonPath)) {
    console.error(red(`No .template/files/ directory found in ${selected}`))
    return
  }

  const filesDir = join(lessonPath, '.template', 'files')
  const solutionsDir = join(lessonPath, '.template', 'solutions')

  const fileCount = countFiles(filesDir)

  const proceed = await confirm({
    message: `Copy ${fileCount} file(s) from files/ to solutions/? Existing solutions will be overwritten.`,
  })

  if (isCancel(proceed) || !proceed)
    return

  const s = spinner()
  s.start('Copying to solutions/...')
  copyDir(filesDir, solutionsDir)
  s.stop(green(`Copied ${fileCount} file(s) to solutions/`))
}

export async function duplicateSolutionsWizard() {
  try {
    await duplicateSolutions()
  }
  catch (e) {
    console.error(red(String(e)))
  }
}
