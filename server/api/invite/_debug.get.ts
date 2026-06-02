export default defineEventHandler(async () => {
  const storage = useStorage("invites")
  const keys = await storage.getKeys()
  const test = await storage.getItem("invite_AMV-TY2A")
  return { keys, test, cwd: process.cwd() }
})
