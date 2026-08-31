/**
 * Seeds the roster. The roster used to be a constant in the source; it now
 * lives at people/<pushId> so the People tab can edit it without a deploy.
 *
 * Refuses to run if people/ already has anything in it.
 *
 *   node scripts/seed-people.mjs           dry run
 *   node scripts/seed-people.mjs --write   actually writes
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

const ROSTER = ['Sin Ying', 'Sin Yek', 'Wan Fang', 'Siang Wei', 'Chee Ka']

const existing = await (await fetch(`${BASE}/people.json?shallow=true`)).json()
if (existing) {
  console.error(`people/ already has ${Object.keys(existing).length} entries. Nothing to do.`)
  process.exit(1)
}

console.log(`Seeding ${ROSTER.length}: ${ROSTER.join(', ')}`)
if (!write) {
  console.log('\nDry run. Re-run with --write to push this to Firebase.')
  process.exit(0)
}

// Spaced timestamps so the roster keeps a stable display order
let t = Date.now()
for (const name of ROSTER) {
  const res = await fetch(`${BASE}/people.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, createdAt: t++ }),
  })
  if (!res.ok) throw new Error(`POST failed for ${name}: ${res.status}`)
}
console.log(`\nWrote ${ROSTER.length} people.`)
