import { useEffect, useState } from 'react'
import { BottomSheet } from './BottomSheet'
import { isCovering, type Status } from '../lib/rotation'
import { plural, relativeDay, todayISO, weekday, formatDate } from '../lib/date'
import type { Entry } from '../types'

type Props = {
  open: boolean
  status: Status
  entries: Entry[]
  busy: boolean
  onClose: () => void
  onConfirm: (name: string, date: string, coveringFor?: string) => void
}

/**
 * Pick a name, confirm if something looks off, then write.
 *
 *   1. Someone already logged that day — catches the accidental double tap
 *   2. This person already went this round while others still owe a turn, so
 *      they are probably standing in. Asking who for is what keeps the rotation
 *      honest: without it the person who was covered looks overdue forever.
 *
 * The date is editable because people forget to log on the day. Backdating is
 * the normal case, not an edge case, so it is one tap away rather than hidden.
 */
export function CheckIn({ open, status, entries, busy, onClose, onConfirm }: Props) {
  const { queue, remaining } = status
  const [pending, setPending] = useState<string | null>(null)
  const [date, setDate] = useState(todayISO())

  // Reopening should not inherit a date chosen days ago in a previous session
  useEffect(() => { if (open) setDate(todayISO()) }, [open])

  const close = () => { setPending(null); onClose() }

  const onThatDay = entries.filter((e) => e.date === date)
  const isToday = date === todayISO()

  const pick = (name: string) => {
    if (onThatDay.length > 0 || isCovering(status, name)) setPending(name)
    else onConfirm(name, date)
  }

  if (pending) {
    const duplicate = onThatDay.length > 0
    return (
      <BottomSheet
        open={open}
        title={duplicate ? 'Already logged that day' : 'Standing in for someone?'}
        onClose={close}
      >
        {duplicate ? (
          <>
            <div className="callout">
              <strong>{onThatDay.map((e) => e.name).join(', ')}</strong> already logged
              a clean on {formatDate(date)}. Logging again creates a second entry — continue?
            </div>
            <div className="sheet-actions">
              <button className="btn ghost" onClick={() => setPending(null)} disabled={busy}>
                Back
              </button>
              <button className="btn" onClick={() => onConfirm(pending, date)} disabled={busy}>
                {busy ? 'Saving…' : `Log ${pending}`}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="callout">
              <strong>{pending}</strong> has already had a turn this round.
              Whose turn is this one? Picking a name keeps them from looking
              overdue when they are not.
            </div>
            <div className="name-grid">
              {remaining.map((q) => (
                <button
                  key={q.name}
                  className="name-btn turn"
                  onClick={() => onConfirm(pending, date, q.name)}
                  disabled={busy}
                >
                  <span className="n">{q.name}</span>
                  <span className="d">
                    {q.daysAgo === null ? 'Never cleaned' : `${plural(q.daysAgo, 'day')} ago`}
                  </span>
                </button>
              ))}
            </div>
            <div className="stack" style={{ marginTop: 12 }}>
              <button className="btn ghost" onClick={() => onConfirm(pending, date)} disabled={busy}>
                Nobody — it is an extra clean
              </button>
              <button className="btn ghost" onClick={() => setPending(null)} disabled={busy}>
                Back
              </button>
            </div>
          </>
        )}
      </BottomSheet>
    )
  }

  return (
    <BottomSheet
      open={open}
      title="Who cleaned?"
      hint="Tap a name to log it. Tapped the wrong one? Tap the entry in History to remove it."
      onClose={close}
    >
      <label className="date-field">
        <span className="dl">
          When
          {!isToday && <span className="dl-note"> · {relativeDay(date)}</span>}
        </span>
        <input
          type="date"
          className="text-input"
          value={date}
          max={todayISO()}
          onChange={(e) => { if (e.target.value) setDate(e.target.value) }}
        />
        <span className="dl-day">{weekday(date)}{isToday ? ' · today' : ''}</span>
      </label>

      <div className="name-grid">
        {queue.map((q) => (
          <button
            key={q.name}
            className={`name-btn${q.done ? '' : ' turn'}`}
            onClick={() => pick(q.name)}
            disabled={busy}
          >
            <span className="n">{q.name}</span>
            <span className="d">
              {q.done
                ? 'Already went'
                : q.daysAgo === null
                  ? 'Never cleaned'
                  : `${plural(q.daysAgo, 'day')} ago`}
            </span>
          </button>
        ))}
      </div>
      <div className="sheet-actions">
        <button className="btn ghost" onClick={close}>Cancel</button>
      </div>
    </BottomSheet>
  )
}
