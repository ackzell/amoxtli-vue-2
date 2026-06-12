import type { Observable } from 'dexie'

import type { Snapshot, SnapshotType } from '@/db'
import { liveQuery } from 'dexie'

import { db } from '@/db'

export const snapshots = {
  create,
  liveQuerySnapshots,
  getLatestByType,
  deleteSnapshot,
}

async function create({ sessionId, files, type = 'manual', message = '' }: Omit<Snapshot, 'id' | 'createdAt'>,
): Promise<Snapshot> {
  const createdAt = new Date()

  const snapshotId = await db.snapshots.add({
    sessionId,
    files: JSON.parse(JSON.stringify(files)), // Deep copy
    createdAt,
    type,
    message,
  })

  return await db.snapshots.get(snapshotId) as Snapshot
}

function liveQuerySnapshots(sessionId: number): Observable<Snapshot[]> {
  return liveQuery(async () => await db.snapshots.where({ sessionId }).reverse().sortBy('createdAt'))
}

async function getLatestByType(type: SnapshotType, sessionId?: number): Promise<Snapshot | undefined> {
  const snaps = await db.snapshots
    .where('type').equals(type)
    .filter(s => sessionId === undefined || s.sessionId === sessionId)
    .sortBy('createdAt')
  return snaps.pop()
}

function deleteSnapshot(snapshotId: number): Promise<void> {
  return db.snapshots.delete(snapshotId)
}
