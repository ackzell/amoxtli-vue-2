import type { Session, Snapshot } from '@/db'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { ref, watch } from 'vue'

import { useToastsStore } from '@/components/Toasts/useToastsStore'
import { sessions } from '@/db/sessions'
import { snapshots } from '@/db/snapshots'

export const useFileManagerStore = defineStore('fileManagerStore', () => {
  const currentSession = ref<Session>()

  const sessionList = ref<Session[]>([])
  const snapshotsList = ref<Snapshot[]>([])

  const { toast } = useToastsStore()
  const guide = useGuideStore()

  let play: ReturnType<typeof usePlaygroundStore> | null = null
  function getPlaygroundStore() {
    if (!play)
      play = usePlaygroundStore()
    return play
  }

  // When the lesson changes, auto-save a snapshot before the new files mount
  watch(
    () => [guide.currentGuide, guide.showingSolution] as const,
    async ([currentGuide]) => {
      if (!currentGuide?.sessionName) {
        let currentPath = ''
        if (window) {
          currentPath = window.location.pathname
        }
        console.warn('[guide-meta] Current guide does not have a sessionName. Skipping session load and snapshot save.', currentGuide, currentPath)
        return
      }

      // Set up session FIRST
      const existing = await sessions.getByName(currentGuide.sessionName)
      if (existing) {
        currentSession.value = existing
      }
      else {
        currentSession.value = await sessions.create(currentGuide.sessionName)
      }

      // THEN save snapshot, now that currentSession is populated
      await saveSnapshot({ type: 'auto', message: 'Lesson load' })
    },
  )

  // Keep snapshotsList in sync with the current session
  watch(currentSession, (newSession, _, onCleanup) => {
    if (newSession) {
      const subscription = snapshots.liveQuerySnapshots(newSession.id).subscribe((snaps: Snapshot[]) => {
        snapshotsList.value = snaps
      })
      onCleanup(() => subscription.unsubscribe())
    }
  }, { immediate: true })

  sessions.liveQuerySessions().subscribe((s: Session[]) => {
    sessionList.value = s
  })

  async function saveSnapshot(snapshot: Pick<Snapshot, 'type' | 'message'>): Promise<void> {
    if (!currentSession.value) {
      console.error('No active session. Cannot save snapshot.')
      toast.error('No active session. Cannot save snapshot.')
      return
    }

    const playground = getPlaygroundStore()

    // Read current file contents from the playground files Map
    const currentFiles = Object.fromEntries(
      Array.from(playground.files.entries()).map(([path, file]) => [path, file.read()]),
    )

    const latestSnapshotByType = await snapshots.getLatestByType(snapshot.type)

    if (!latestSnapshotByType) {
      await snapshots.create({
        sessionId: currentSession.value.id,
        files: currentFiles,
        type: snapshot.type,
        message: snapshot.message,
      })
      await sessions.changeUpdatedAt(currentSession.value.id, new Date())
    }
    else {
      const didFilesChange = filesHaveChanged(currentFiles, latestSnapshotByType.files)

      if (didFilesChange) {
        await snapshots.create({
          sessionId: currentSession.value.id,
          files: currentFiles,
          type: snapshot.type,
          message: snapshot.message,
        })
        await sessions.changeUpdatedAt(currentSession.value.id, new Date())

        if (snapshot.type === 'manual')
          toast.success('Snapshot saved')
      }
      else {
        if (snapshot.type === 'manual')
          toast.info('Nothing new to save')
      }
    }
  }

  function filesHaveChanged(a: Record<string, string>, b: Record<string, string>): boolean {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)

    if (keysA.length !== keysB.length)
      return true

    return keysA.some(key => a[key] !== b[key])
  }

  async function deleteSnapshot(snapshotId: number): Promise<void> {
    await snapshots.deleteSnapshot(snapshotId)
  }

  async function restoreSnapshot(snapshot: Snapshot): Promise<void> {
    await saveSnapshot({ type: 'auto', message: 'Before a snapshot was restored' })

    const playground = getPlaygroundStore()
    // Mount the snapshot files back into the WebContainer
    await playground.mount(snapshot.files)

    // Update the session's updatedAt to reflect the restore action
    await sessions.changeUpdatedAt(currentSession.value!.id, new Date())
  }

  return {
    currentSession,
    snapshotsList,
    sessionList,
    saveSnapshot,
    deleteSnapshot,
    restoreSnapshot,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useFileManagerStore, import.meta.hot))
