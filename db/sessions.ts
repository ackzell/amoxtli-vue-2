import type { Observable } from 'dexie'

import type { Session } from '@/db'

import { liveQuery } from 'dexie'

import { db } from '@/db'

export const sessions = {
  create,
  getById,
  getByName,
  getCount,
  liveQuerySessions,
  getLatestSession,
  changeUpdatedAt,
}

async function create(name: string): Promise<Session> {
  const currentTime = new Date()
  const id = await db.sessions.add({
    name,
    createdAt: currentTime,
    updatedAt: currentTime,
  })

  return await db.sessions.get(id) as Session
}

async function changeUpdatedAt(sessionId: number, updatedAt: Date): Promise<void> {
  await db.sessions.update(sessionId, { updatedAt })
}

function liveQuerySessions(): Observable<Session[]> {
  return liveQuery(async () => await db.sessions.reverse().sortBy('createdAt'))
}

async function getById(id: number): Promise<Session | undefined> {
  return db.sessions.get(id)
}

async function getByName(name: string): Promise<Session | undefined> {
  return db.sessions.where('name').equals(name).first()
}

async function getCount(): Promise<number> {
  return db.sessions.count()
}

async function getLatestSession(): Promise<Session | undefined> {
  return (await db.sessions.reverse().limit(1).toArray())[0]
}
