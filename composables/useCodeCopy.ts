export function useCodeCopy() {
  const { copy } = useClipboard()
  const copied = ref(false)

  async function copyCode(content: string) {
    if (!content)
      return

    await copy(content)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1200)
  }

  return { copied, copyCode }
}
