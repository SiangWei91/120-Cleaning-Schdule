import type { Entry, NewEntry, Person } from '../types'

const BASE = import.meta.env.VITE_FIREBASE_URL as string

if (!BASE) throw new Error('VITE_FIREBASE_URL is missing — check .env')

/**
 * Realtime Database over plain REST; no SDK, keeps the bundle tiny.
 *
 * Entries live at entries/{pushId}, one key per entry. The old version read the
 * whole array, pushed onto it and wrote the whole array back — two people
 * logging at the same time silently overwrote each other. Now each write only
 * touches its own key, and deleting is a single DELETE.
 */
async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, init)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Firebase ${res.status}: ${body.slice(0, 200) || res.statusText}`)
  }
  return res.json() as Promise<T>
}

export async function listEntries(): Promise<Entry[]> {
  const data = await req<Record<string, NewEntry> | null>('entries.json')
  if (!data) return []
  return Object.entries(data)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date.localeCompare(b.date)))
}

export async function addEntry(entry: NewEntry): Promise<Entry> {
  const { name: id } = await req<{ name: string }>('entries.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  })
  return { id, ...entry }
}

export async function removeEntry(id: string): Promise<void> {
  const res = await fetch(`${BASE}/entries/${id}.json`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Delete failed (${res.status})`)
}

/**
 * The roster lives in the database rather than in the code, so a new person can
 * be added from the People tab without a deploy.
 */
export async function listPeople(): Promise<Person[]> {
  const data = await req<Record<string, Omit<Person, 'id'>> | null>('people.json')
  if (!data) return []
  return Object.entries(data)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => a.createdAt - b.createdAt)
}

export async function addPerson(name: string): Promise<Person> {
  const person = { name, createdAt: Date.now() }
  const { name: id } = await req<{ name: string }>('people.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(person),
  })
  return { id, ...person }
}

/** Removes someone from the roster. Their past entries are left alone. */
export async function removePerson(id: string): Promise<void> {
  const res = await fetch(`${BASE}/people/${id}.json`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Delete failed (${res.status})`)
}

/**
 * Park someone out of the rotation without deleting them. Needed because the
 * queue is driven by how long someone has waited: a person who is overseas for
 * months would otherwise sit permanently at the top of it.
 */
export async function setPersonAway(id: string, away: boolean, since?: string): Promise<void> {
  const res = await fetch(`${BASE}/people/${id}.json`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(since === undefined ? { away } : { away, since }),
  })
  if (!res.ok) throw new Error(`Update failed (${res.status})`)
}
