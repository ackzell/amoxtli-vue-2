import type { EntityTable } from 'dexie'
import Dexie from 'dexie'

export interface Session {
  id: number
  name: string
  createdAt: Date
  updatedAt: Date
}

export type SnapshotType = 'manual' | 'auto' | 'periodic'

export interface Snapshot {
  id: number
  sessionId: number
  files: Record<string, string>
  createdAt: Date
  type: SnapshotType
  message: string
}

const db = new Dexie('AmoxtliVueDB') as Dexie & {
  sessions: EntityTable<Session, 'id'>
  snapshots: EntityTable<Snapshot, 'id'>
}

db.version(1).stores({
  sessions: '++id, name, createdAt, updatedAt',
  snapshots: '++id, sessionId, files, createdAt, type, message',
})

export { db }
