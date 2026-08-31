import { useState } from 'react'
import { BottomSheet } from './BottomSheet'
import { isCovering, type Status } from '../lib/rotation'
import { plural } from '../lib/date'

type Props = {
  open: boolean
  status: Status
  busy: boolean
  onClose: () => void
  onConfirm: (name: string, coveringFor?: string) => void
}

/**
 * Pick a name, confirm if something looks off, then write.
 *
 *   1. Someone already logged today — catches the accidental double tap
 *   2. This person already went this round while others still owe a turn, so
 *      they are probably standing in. Asking who for is what keeps the rotation
 *      honest: without it the person who was covered looks overdue forever.
 */
export function CheckIn({ open, status, busy, onClose, onConfirm }: Props) {
  const { queue, todayEntries, remaining } = status
  const [pending, setPending] = useState<string | null>(null)

  const close = () => { setPending(null); onClose() }

  const pick = (name: string) => {
    if (todayEntries.length > 0 || isCovering(status, name)) setPending(name)
    else onConfirm(name)
  }

  if (pending) {
    const duplicate = todayEntries.length > 0
    return (
      <BottomSheet
        open={open}
        title={duplicate ? 'Already logged today' : 'Standing in for someone?'}
        onClose={close}
      >
        {duplicate ? (
          <>
            <div className="callout">
              <strong>{todayEntries.map((e) => e.name).join(', ')}</strong> already logged
              a clean today. Logging again creates a second entry — continue?
            </div>
            <div className="sheet-actions">
              <button className="btn ghost" onClick={() => setPending(null)} disabled={busy}>
                Back
              </button>
              <button className="btn" onClick={() => onConfirm(pending)} disabled={busy}>
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
                  onClick={() => onConfirm(pending, q.name)}
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
              <button className="btn ghost" onClick={() => onConfirm(pending)} disabled={busy}>
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
