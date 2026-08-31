import { formatDate, plural } from '../lib/date'
import type { Status } from '../lib/rotation'

type Props = {
  status: Status
  loading: boolean
}

export function ScheduleView({ status, loading }: Props) {
  const overdue = status.overdueDays ?? 0
  const { remaining, roundComplete, nextUp } = status

  return (
    <>
      <div className="card hero">
        {loading ? (
          <>
            <div className="skeleton" style={{ width: 90, margin: '6px auto' }} />
            <div className="skeleton" style={{ width: 180, height: 34, margin: '16px auto' }} />
            <div className="skeleton" style={{ width: 140, margin: '6px auto' }} />
          </>
        ) : (
          <>
            <div className="label">
              {roundComplete ? `Round ${status.roundNumber} complete` : 'Still to go this round'}
            </div>

            {/* The set is the honest answer; the order inside it is a guess */}
            {roundComplete || remaining.length === 1 ? (
              <div className="name">{roundComplete ? 'Everyone' : remaining[0].name}</div>
            ) : (
              <div className="remaining">
                {remaining.map((q) => (
                  <span key={q.name} className="rchip">{q.name}</span>
                ))}
                {remaining.length === 0 && <span className="rchip">—</span>}
              </div>
            )}

            <div className="meta">
              {roundComplete
                ? 'The next clean starts a new round'
                : remaining.length > 1 && nextUp
                  ? `Longest wait is ${nextUp.name}`
                  : nextUp
                    ? nextUp.daysAgo == null
                      ? 'Has never cleaned'
                      : `Last cleaned ${plural(nextUp.daysAgo, 'day')} ago`
                    : 'Nobody on the roster yet'}
            </div>
            {status.dueDate && (
              <div className={`pill${overdue > 0 ? ' warn' : ''}`}>
                {overdue > 0
                  ? `${plural(overdue, 'day')} overdue`
                  : overdue === 0
                    ? 'Due today'
                    : `Due in ${plural(-overdue, 'day')} · ${formatDate(status.dueDate)}`}
              </div>
            )}
          </>
        )}
      </div>

      <div className="section-title">
        <span>{roundComplete ? 'Everyone' : `Round ${status.roundNumber}`}</span>
        <span>Last cleaned</span>
      </div>
      <div className="card" style={{ padding: '8px 14px' }}>
        {loading ? (
          <div style={{ padding: '10px 0', display: 'grid', gap: 15 }}>
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton" />)}
          </div>
        ) : status.queue.length === 0 ? (
          <div className="empty" style={{ padding: '18px 0' }}>
            Nobody on the roster. Add someone in the People tab.
          </div>
        ) : (
          <div className="queue">
            {status.queue.map((q) => (
              <div key={q.name} className={`queue-row${q.done ? ' done' : ''}`}>
                <span className={`queue-pos${q.done ? '' : ' owed'}`}>
                  {q.done ? '✓' : '·'}
                </span>
                <span className="queue-name">{q.name}</span>
                <span className="queue-meta">
                  {q.daysAgo == null ? 'Never' : `${plural(q.daysAgo, 'day')} ago`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
