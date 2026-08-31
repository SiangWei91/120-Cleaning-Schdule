import { useMemo } from 'react'
import type { Entry } from '../types'
import { formatDate, monthLabel, relativeDay, toISO, weekdayShort } from '../lib/date'
import { initials } from '../lib/name'

type Props = {
  entries: Entry[]
  showAll: boolean
  onShowAll: () => void
  onPick: (entry: Entry) => void
}

/** Start of the month two months back, so the default view covers three calendar months. */
function threeMonthCutoff(): string {
  const d = new Date()
  return toISO(new Date(d.getFullYear(), d.getMonth() - 2, 1))
}

export function HistoryView({ entries, showAll, onShowAll, onPick }: Props) {
  const newestFirst = useMemo(() => [...entries].reverse(), [entries])

  // Same person, same day, more than once — flag it so it can be tapped away
  const duplicates = useMemo(() => {
    const seen = new Map<string, number>()
    for (const e of entries) {
      const k = `${e.date}|${e.name}`
      seen.set(k, (seen.get(k) ?? 0) + 1)
    }
    return new Set([...seen].filter(([, n]) => n > 1).map(([k]) => k))
  }, [entries])

  if (!entries.length) return <div className="card empty">No entries yet</div>

  const cutoff = threeMonthCutoff()
  const visible = showAll ? newestFirst : newestFirst.filter((e) => e.date >= cutoff)
  const hidden = newestFirst.length - visible.length

  const groups: { month: string; items: Entry[] }[] = []
  for (const e of visible) {
    const m = monthLabel(e.date)
    if (groups[groups.length - 1]?.month !== m) groups.push({ month: m, items: [] })
    groups[groups.length - 1].items.push(e)
  }

  return (
    <>
      <div className="section-title">
        <span>{showAll ? `All ${entries.length} entries` : 'Last 3 months'}</span>
        <span style={{ textTransform: 'none', letterSpacing: 0 }}>Tap to delete</span>
      </div>

      {groups.length === 0 && (
        <div className="card empty">Nothing logged in the last three months</div>
      )}

      {groups.map((g) => (
        <div key={g.month}>
          <div className="month-head">{g.month}</div>
          {g.items.map((e, i) => (
            <button
              key={e.id}
              className={`entry${i === 0 ? ' first' : ''}${i === g.items.length - 1 ? ' last' : ''}`}
              onClick={() => onPick(e)}
            >
              <span className="avatar">{initials(e.name)}</span>
              <span className="who">
                {e.name}
                {e.for && <span className="for-flag">standing in for {e.for}</span>}
                {duplicates.has(`${e.date}|${e.name}`) && <span className="dup-flag">Duplicate</span>}
              </span>
              <span className="when">
                {formatDate(e.date)} {weekdayShort(e.date)}
                <br />
                {relativeDay(e.date)}
              </span>
            </button>
          ))}
        </div>
      ))}

      {!showAll && hidden > 0 && (
        <button className="btn ghost" style={{ marginTop: 18 }} onClick={onShowAll}>
          View all history · {hidden} older back to {formatDate(newestFirst[newestFirst.length - 1].date)}
        </button>
      )}
    </>
  )
}
