import type { ReactElement } from 'react'

export type TabId = 'schedule' | 'history' | 'people'

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const ICONS: Record<TabId, ReactElement> = {
  schedule: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <g {...stroke}>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M3 10h18M8 3v4M16 3v4" />
        <path d="M9 15l2 2 4-4" />
      </g>
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <g {...stroke}>
        <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
        <path d="M3 4v4h4" />
        <path d="M12 7.5V12l3 2" />
      </g>
    </svg>
  ),
  people: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <g {...stroke}>
        <circle cx="9.5" cy="8.5" r="3.4" />
        <path d="M3 20a6.5 6.5 0 0 1 13 0" />
        <path d="M16.2 5.6a3.4 3.4 0 0 1 0 5.8M17.5 14.3A6.5 6.5 0 0 1 21 20" />
      </g>
    </svg>
  ),
}

const LABELS: Record<TabId, string> = {
  schedule: 'Schedule',
  history: 'History',
  people: 'People',
}

export function TabBar({ tab, onChange }: { tab: TabId; onChange: (t: TabId) => void }) {
  return (
    <nav className="tabbar">
      <div className="tabbar-inner">
        {(Object.keys(LABELS) as TabId[]).map((id) => (
          <button
            key={id}
            className="tab"
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => onChange(id)}
          >
            {ICONS[id]}
            <span>{LABELS[id]}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
