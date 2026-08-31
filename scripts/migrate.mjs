/**
 * One-off migration: ProductList/<pushId>/[...]  ->  entries/<pushId>
 *
 * The old shape was a single array under one push key, which is why two people
 * logging at the same moment could overwrite each other. One key per entry
 * fixes that and makes delete a single request.
 *
 * Non-destructive: ProductList is left exactly as it is, as a backup.
 * Exact duplicates (same person, same day) are collapsed to one.
 *
 *   node scripts/migrate.mjs           dry run, prints what it would write
 *   node scripts/migrate.mjs --write   actually writes entries/
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const env = Object.fromEntries(
  readFileSync(resolve(root, '.env'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const BASE = env.VITE_FIREBASE_URL
const write = process.argv.includes('--write')

const toISO = (ddmmyyyy) => {
  const [d, m, y] = ddmmyyyy.split('/')
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

const old = await (await fetch(`${BASE}/ProductList.json`)).json()
const rows = Object.values(old ?? {}).flat().filter(Boolean)
console.log(`ProductList: ${rows.length} rows`)

const seen = new Set()
const entries = []
for (const r of rows) {
  if (!r?.Date || !r?.Name) continue
  const date = toISO(r.Date)
  const key = `${date}|${r.Name}`
  if (seen.has(key)) {
    console.log(`  skip duplicate: ${r.Name} on ${r.Date}`)
    continue
  }
  seen.add(key)
  // Midday local so the timestamp never lands on the wrong calendar day
  entries.push({ date, name: r.Name, createdAt: new Date(`${date}T12:00:00`).getTime() })
}
entries.sort((a, b) => a.date.localeCompare(b.date))
console.log(`entries: ${entries.length} after dedupe (${entries[0]?.date} .. ${entries.at(-1)?.date})`)

const existing = await (await fetch(`${BASE}/entries.json?shallow=true`)).json()
if (existing) {
  console.error(`\nentries/ already has ${Object.keys(existing).length} keys. Refusing to run twice.`)
  process.exit(1)
}

if (!write) {
  console.log('\nDry run. Re-run with --write to push this to Firebase.')
  process.exit(0)
}

for (const e of entries) {
  const res = await fetch(`${BASE}/entries.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(e),
  })
  if (!res.ok) throw new Error(`POST failed for ${e.date} ${e.name}: ${res.status}`)
}
console.log(`\nWrote ${entries.length} entries. ProductList untouched.`)
