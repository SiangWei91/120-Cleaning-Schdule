import type { Entry, Person } from '../types'
import { addDays, daysBetween, todayISO } from './date'

/** How often the house is meant to be cleaned, used for the due date. */
export const CYCLE_DAYS = 7

/**
 * Whose slot in the rotation this entry filled.
 *
 * When Wan Fang stands in for Chee Ka, the work is Wan Fang's but the turn is
 * Chee Ka's — otherwise Chee Ka's wait keeps growing and the app keeps calling
 * their name for a turn that has already been done.
 */
export const slotOwner = (e: Entry) => e.for ?? e.name

export type QueueItem = {
  name: string
  /** Last time this person's slot came up, whoever actually did it */
  lastDate: string | null
  daysAgo: number | null
  position: number
  /** Already had a turn in the round that is currently open */
  done: boolean
}

export type Round = {
  number: number
  /** Newest entry first, the way it is displayed */
  items: Entry[]
  from: string
  to: string
}

/**
 * Split the history into rounds. A round ends the moment a slot comes back
 * around. That needs no fixed order and survives people joining, leaving and
 * standing in for each other. A same-day repeat is a duplicate, not a round.
 */
export function buildRounds(entries: Entry[]): Round[] {
  const rounds: Round[] = []
  let items: Entry[] = []
  let seen = new Map<string, string>()

  for (const e of entries) {
    const owner = slotOwner(e)
    const previous = seen.get(owner)
    if (previous !== undefined && previous !== e.date) {
      rounds.push(finish(items, rounds.length + 1))
      items = []
      seen = new Map()
    }
    seen.set(owner, e.date)
    items.push(e)
  }
  if (items.length) rounds.push(finish(items, rounds.length + 1))

  return rounds.reverse()
}

function finish(items: Entry[], number: number): Round {
  return {
    number,
    from: items[0].date,
    to: items[items.length - 1].date,
    items: [...items].reverse(),
  }
}

export type Status = {
  /** Active roster: those who still owe a turn first, longest wait first */
  queue: QueueItem[]
  /** Best single guess. `remaining` is the more honest answer */
  nextUp: QueueItem | null
  /** Who has not taken their turn in the open round */
  remaining: QueueItem[]
  roundNumber: number
  /** Everyone has had a turn, so the next clean starts a fresh round */
  roundComplete: boolean
  lastEntry: Entry | null
  dueDate: string | null
  /** Positive = overdue by that many days */
  overdueDays: number | null
  todayEntries: Entry[]
}

/**
 * Who is up next?
 *
 * Two layers, because the history says only one of them is knowable:
 *
 *  1. WHO STILL OWES A TURN this round — solid. Against the real history the
 *     next person to clean was someone who still owed a turn 88% of the time.
 *  2. WHICH ONE of them goes first — largely unknowable. The order inside a
 *     round is reshuffled every round here. Longest wait among those who owe is
 *     right 67% of the time, against 49% for longest wait overall. A suggestion,
 *     never the answer.
 *
 * People marked away drop out of both layers, and rejoin dated from their
 * return, so three months abroad neither pins them at the top nor is ignored.
 */
export function getStatus(entries: Entry[], people: Person[]): Status {
  const today = todayISO()
  const rounds = buildRounds(entries)
  const openRound = rounds[0]
  const doneThisRound = new Set(openRound?.items.map(slotOwner) ?? [])

  const lastTurn = new Map<string, string>()
  for (const e of entries) lastTurn.set(slotOwner(e), e.date)

  const active = people.filter((p) => !p.away)
  const roundComplete = active.length > 0 && active.every((p) => doneThisRound.has(p.name))

  const items: QueueItem[] = active.map((p) => {
    const turn = lastTurn.get(p.name) ?? null
    // Someone back from a break waits from the day they rejoined, not from a
    // last turn that is months stale
    const lastDate = p.since && (turn === null || p.since > turn) ? p.since : turn
    return {
      name: p.name,
      lastDate,
      daysAgo: lastDate ? daysBetween(lastDate, today) : null,
      position: 0,
      // A completed round means everyone is owed again
      done: roundComplete ? false : doneThisRound.has(p.name),
    }
  })

  const byLongestWait = (a: QueueItem, b: QueueItem) => {
    if (a.lastDate === null && b.lastDate === null) return 0
    if (a.lastDate === null) return -1
    if (b.lastDate === null) return 1
    return a.lastDate.localeCompare(b.lastDate)
  }

  const queue = [...items]
    .sort((a, b) => (a.done === b.done ? byLongestWait(a, b) : a.done ? 1 : -1))
    .map((q, i) => ({ ...q, position: i }))

  const lastEntry = entries.length ? entries[entries.length - 1] : null
  const dueDate = lastEntry ? addDays(lastEntry.date, CYCLE_DAYS) : null

  return {
    queue,
    nextUp: queue[0] ?? null,
    remaining: queue.filter((q) => !q.done),
    roundNumber: openRound?.number ?? 0,
    roundComplete,
    lastEntry,
    dueDate,
    overdueDays: dueDate ? daysBetween(dueDate, today) : null,
    todayEntries: entries.filter((e) => e.date === today),
  }
}

/**
 * Someone taking a second turn while other people still owe one — in other
 * words, standing in. Unlike a guess at the order this is a fact; against the
 * real history it fires on about 10% of logs.
 */
export function isCovering(status: Status, name: string): boolean {
  return status.queue.some((q) => q.name === name && q.done)
}
