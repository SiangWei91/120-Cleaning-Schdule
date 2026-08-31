import { useState } from 'react'
import type { Person } from '../types'
import { BottomSheet } from '../components/BottomSheet'
import { initials } from '../lib/name'

type Props = {
  people: Person[]
  busy: boolean
  onAdd: (name: string) => Promise<void>
  onSetAway: (person: Person, away: boolean) => Promise<void>
  onRemove: (person: Person) => Promise<void>
}

export function PeopleView({ people, busy, onAdd, onSetAway, onRemove }: Props) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [selected, setSelected] = useState<Person | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const name = draft.trim()
  const taken = people.some((p) => p.name.toLowerCase() === name.toLowerCase())
  const canAdd = name.length > 0 && name.length <= 30 && !taken

  const closeActions = () => { setSelected(null); setConfirmRemove(false) }

  async function submit() {
    if (!canAdd) return
    await onAdd(name)
    setDraft('')
    setAdding(false)
  }

  return (
    <>
      {people.length === 0 && (
        <div className="card empty">Nobody on the roster yet. Add the first person below.</div>
      )}

      {people.map((p, i) => (
        <button
          key={p.id}
          className={`entry${i === 0 ? ' first' : ''}${i === people.length - 1 ? ' last' : ''}${p.away ? ' away' : ''}`}
          onClick={() => setSelected(p)}
        >
          <span className="avatar">{initials(p.name)}</span>
          <span className="who">{p.name}</span>
          {p.away && <span className="when">Away</span>}
        </button>
      ))}

      <button className="btn ghost" style={{ marginTop: 18 }} onClick={() => setAdding(true)}>
        + Add person
      </button>

      <BottomSheet
        open={adding}
        title="Add person"
        hint="They join the queue and the list of names straight away."
        onClose={() => { setAdding(false); setDraft('') }}
      >
        <input
          className="text-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void submit() }}
          placeholder="Name"
          maxLength={30}
          autoFocus
          enterKeyHint="done"
        />
        {taken && <div className="field-error">{name} is already on the roster</div>}
        <div className="sheet-actions">
          <button
            className="btn ghost"
            onClick={() => { setAdding(false); setDraft('') }}
            disabled={busy}
          >
            Cancel
          </button>
          <button className="btn" onClick={() => void submit()} disabled={!canAdd || busy}>
            {busy ? 'Adding…' : 'Add'}
          </button>
        </div>
      </BottomSheet>

      <BottomSheet
        open={selected !== null}
        title={selected?.name ?? ''}
        hint={confirmRemove
          ? 'They come off the roster for good. Their past cleans stay in the history.'
          : undefined}
        onClose={closeActions}
      >
        {confirmRemove ? (
          <div className="sheet-actions">
            <button className="btn ghost" onClick={() => setConfirmRemove(false)} disabled={busy}>
              Back
            </button>
            <button
              className="btn danger"
              onClick={async () => {
                if (!selected) return
                await onRemove(selected)
                closeActions()
              }}
              disabled={busy}
            >
              {busy ? 'Removing…' : 'Remove'}
            </button>
          </div>
        ) : (
          <div className="stack">
            <button
              className="btn ghost"
              onClick={async () => {
                if (!selected) return
                await onSetAway(selected, !selected.away)
                closeActions()
              }}
              disabled={busy}
            >
              {selected?.away ? 'Back — rejoin the queue' : 'Away for a while'}
            </button>
            <button
              className="btn ghost danger-text"
              onClick={() => setConfirmRemove(true)}
              disabled={busy}
            >
              Remove from roster
            </button>
            <button className="btn ghost" onClick={closeActions}>Cancel</button>
          </div>
        )}
      </BottomSheet>
    </>
  )
}
