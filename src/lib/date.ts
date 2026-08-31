const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/**
 * Local calendar day. Deliberately not toISOString() — that converts to UTC,
 * so anyone logging late at night in Singapore would land on the wrong day.
 */
export function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayISO = () => toISO(new Date())

/** DD/MM/YYYY — same format the old app used, so nothing looks unfamiliar. */
export function formatDate(iso: string): string {
  const d = fromISO(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export function weekday(iso: string) { return WEEKDAYS[fromISO(iso).getDay()] }
export function weekdayShort(iso: string) { return WEEKDAYS_SHORT[fromISO(iso).getDay()] }

export function daysBetween(aISO: string, bISO: string): number {
  return Math.round((fromISO(bISO).getTime() - fromISO(aISO).getTime()) / 86_400_000)
}

export function addDays(iso: string, n: number): string {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export function monthLabel(iso: string): string {
  const d = fromISO(iso)
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** "today" / "yesterday" / "12 days ago" */
export function relativeDay(iso: string, today = todayISO()): string {
  const n = daysBetween(iso, today)
  if (n === 0) return 'today'
  if (n === 1) return 'yesterday'
  if (n < 0) return `in ${plural(-n, 'day')}`
  return plural(n, 'day') + ' ago'
}

/** plural(1, 'day') -> "1 day"; plural(3, 'day') -> "3 days" */
export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}
