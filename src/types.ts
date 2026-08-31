export type Entry = {
  id: string
  /** ISO date, YYYY-MM-DD, local calendar day */
  date: string
  /** Who actually did the work */
  name: string
  /**
   * Whose turn it was, when someone stood in for them. Absent on a normal turn.
   * The rotation follows this; the credit for doing the work follows `name`.
   */
  for?: string
  createdAt: number
}

export type NewEntry = Omit<Entry, 'id'>

/** Someone on the roster. Editable from the People tab. */
export type Person = {
  id: string
  name: string
  createdAt: number
  /** Travelling or otherwise out of the rotation for a while, history untouched */
  away?: boolean
  /**
   * Rejoined on this date. Someone back from three months away has a stale last
   * turn; without this they would jump straight to the front of the queue.
   */
  since?: string
}
