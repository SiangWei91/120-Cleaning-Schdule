import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  addEntry, addPerson, listEntries, listPeople, removeEntry, removePerson, setPersonAway,
} from './lib/db'
import { getStatus } from './lib/rotation'
import { formatDate, todayISO, weekday } from './lib/date'
import type { Entry, Person } from './types'
import { CheckIn } from './components/CheckIn'
import { BottomSheet } from './components/BottomSheet'
import { TabBar, type TabId } from './components/TabBar'
import { ScheduleView } from './views/ScheduleView'
import { HistoryView } from './views/HistoryView'
import { PeopleView } from './views/PeopleView'

type Toast = { text: string; error?: boolean; undo?: () => void } | null

const TITLES: Record<TabId, string> = {
  schedule: 'Cleaning Roster',
  history: 'History',
  people: 'People',
}

export default function App() {
  const [tab, setTab] = useState<TabId>('schedule')
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [people, setPeople] = useState<Person[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Entry | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [toast, setToast] = useState<Toast>(null)

  const refresh = useCallback(async () => {
    try {
      const [e, p] = await Promise.all([listEntries(), listPeople()])
      setEntries(e)
      setPeople(p)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  // Re-fetch when the app comes back to the foreground, so nobody is looking at
  // a stale screen after someone else has already logged the clean
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refresh])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), toast.undo ? 6000 : 3000)
    return () => clearTimeout(t)
  }, [toast])

  const status = useMemo(() => getStatus(entries ?? [], people ?? []), [entries, people])
  const today = todayISO()
  const loading = entries === null || people === null

  async function handleCheckIn(name: string, coveringFor?: string) {
    setBusy(true)
    try {
      const created = await addEntry({
        date: today,
        name,
        createdAt: Date.now(),
        ...(coveringFor ? { for: coveringFor } : {}),
      })
      setEntries((prev) => [...(prev ?? []), created])
      setCheckInOpen(false)
      setToast({
        text: coveringFor ? `Logged · ${name} for ${coveringFor}` : `Logged · ${name}`,
        undo: async () => {
          setToast(null)
          try {
            await removeEntry(created.id)
            setEntries((prev) => (prev ?? []).filter((e) => e.id !== created.id))
            setToast({ text: 'Undone' })
          } catch {
            setToast({ text: 'Could not undo — check your connection', error: true })
          }
        },
      })
    } catch (e) {
      setToast({ text: e instanceof Error ? e.message : 'Could not save', error: true })
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(entry: Entry) {
    setBusy(true)
    try {
      await removeEntry(entry.id)
      setEntries((prev) => (prev ?? []).filter((e) => e.id !== entry.id))
      setPendingDelete(null)
      setToast({ text: `Removed ${entry.name} · ${formatDate(entry.date)}` })
    } catch (e) {
      setToast({ text: e instanceof Error ? e.message : 'Could not delete', error: true })
    } finally {
      setBusy(false)
    }
  }

  async function handleAddPerson(name: string) {
    setBusy(true)
    try {
      const created = await addPerson(name)
      setPeople((prev) => [...(prev ?? []), created])
      setToast({ text: `${name} added to the roster` })
    } catch (e) {
      setToast({ text: e instanceof Error ? e.message : 'Could not add', error: true })
    } finally {
      setBusy(false)
    }
  }

  async function handleSetAway(person: Person, away: boolean) {
    setBusy(true)
    try {
      // Coming back resets the clock: months of not cleaning while abroad
      // should not shoot them to the front of the queue on day one
      const since = away ? undefined : today
      await setPersonAway(person.id, away, since)
      setPeople((prev) => (prev ?? []).map(
        (p) => (p.id === person.id ? { ...p, away, ...(since ? { since } : {}) } : p),
      ))
      setToast({ text: away ? `${person.name} is away` : `${person.name} is back in the queue` })
    } catch (e) {
      setToast({ text: e instanceof Error ? e.message : 'Could not update', error: true })
    } finally {
      setBusy(false)
    }
  }

  async function handleRemovePerson(person: Person) {
    setBusy(true)
    try {
      await removePerson(person.id)
      setPeople((prev) => (prev ?? []).filter((p) => p.id !== person.id))
      setToast({
        text: `${person.name} removed`,
        undo: async () => {
          setToast(null)
          try {
            const restored = await addPerson(person.name)
            setPeople((prev) => [...(prev ?? []), restored])
            setToast({ text: `${person.name} is back` })
          } catch {
            setToast({ text: 'Could not undo — check your connection', error: true })
          }
        },
      })
    } catch (e) {
      setToast({ text: e instanceof Error ? e.message : 'Could not remove', error: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="app">
        <div className="topbar">
          <div>
            <h1>{TITLES[tab]}</h1>
            <div className="sub">
              {tab === 'schedule'
                ? `${weekday(today)}, ${formatDate(today)}`
                : tab === 'history'
                  ? `${entries?.length ?? 0} cleans logged`
                  : `${people?.length ?? 0} on the roster`}
            </div>
          </div>
        </div>

        {error && (
          <div
            className="update-bar"
            style={{ background: 'var(--danger-soft)', color: 'var(--danger)', borderColor: 'var(--danger)' }}
          >
            <span>Can&rsquo;t reach the database</span>
            <button onClick={() => void refresh()}>Retry</button>
          </div>
        )}

        {tab === 'schedule' && <ScheduleView status={status} loading={loading} />}

        {tab === 'history' && !loading && (
          <HistoryView
            entries={entries}
            showAll={showAll}
            onShowAll={() => setShowAll(true)}
            onPick={setPendingDelete}
          />
        )}

        {tab === 'people' && !loading && (
          <PeopleView
            people={people}
            busy={busy}
            onAdd={handleAddPerson}
            onSetAway={handleSetAway}
            onRemove={handleRemovePerson}
          />
        )}
      </div>

      {tab === 'schedule' && (
        <div className="cta">
          <div className="cta-inner">
            <button className="btn" onClick={() => setCheckInOpen(true)} disabled={loading}>
              {status.todayEntries.length
                ? `Logged today: ${status.todayEntries.map((e) => e.name).join(', ')}`
                : 'Log today’s clean'}
            </button>
          </div>
        </div>
      )}

      <TabBar tab={tab} onChange={setTab} />

      <CheckIn
        open={checkInOpen}
        status={status}
        busy={busy}
        onClose={() => setCheckInOpen(false)}
        onConfirm={(name, coveringFor) => void handleCheckIn(name, coveringFor)}
      />

      <BottomSheet
        open={pendingDelete !== null}
        title="Delete this entry?"
        hint={pendingDelete
          ? `${pendingDelete.name} · ${weekday(pendingDelete.date)}, ${formatDate(pendingDelete.date)}`
          : ''}
        onClose={() => setPendingDelete(null)}
      >
        <div className="sheet-actions">
          <button className="btn ghost" onClick={() => setPendingDelete(null)} disabled={busy}>
            Cancel
          </button>
          <button
            className="btn danger"
            onClick={() => pendingDelete && void handleDelete(pendingDelete)}
            disabled={busy}
          >
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </BottomSheet>

      {toast && (
        <div className={`toast${toast.error ? ' err' : ''}`} role="status">
          <span>{toast.text}</span>
          {toast.undo && <button onClick={() => void toast.undo?.()}>Undo</button>}
        </div>
      )}
    </>
  )
}
