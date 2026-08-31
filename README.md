# Cleaning Roster

A small PWA for tracking whose turn it is to clean the house. React + TypeScript +
Vite, with Firebase Realtime Database over plain REST (no SDK).

Replaces the old single-file `120-Cleaning-Schdule` app.

## Running it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # -> dist/
npm run icons        # re-render app icons
npm run migrate      # one-off entry migration (already done)
npm run seed-people  # one-off roster seed (already done)
```

`.env` holds `VITE_FIREBASE_URL`. Note this is a static site: anything in `.env`
ends up visible in the shipped bundle. It is not a secret store — the database
rules are what actually protect the data.

## Layout

Three tabs along the bottom:

| Tab | What is on it |
| --- | --- |
| **Schedule** | Who is up next, the full queue, and the button to log today's clean |
| **History** | Grouped by month, newest first. Tap an entry to delete it. Defaults to the last three months; "View all history" reveals the rest |
| **People** | Just the roster: add a member, mark someone away, remove someone. Nothing else — the numbers live on the other two tabs |

## Rounds

Rounds are not shown as a heading anywhere; they are how the app works out who
still owes a turn. A round ends the moment a slot comes back around, which needs
no fixed order and survives people joining, leaving and standing in for each
other. A same-day repeat is a duplicate entry, not a new round.

Against the 91 real entries this gives 21 rounds: nine of five people, ten of
four (someone got skipped), two of three.

## Standing in

An entry records two different things:

```
{ name: "Wan Fang", for: "Chee Ka" }   the work is Wan Fang's, the turn is Chee Ka's
```

Without `for`, a stand-in quietly corrupts the rotation: Wan Fang's second
clean opens a new round while Chee Ka — whose turn was actually done — keeps
ageing and keeps getting called. With it, Chee Ka's slot is marked done and the
round carries on.

So when someone who has already gone this round logs another clean, the app asks
whose turn it is. "Nobody, it is an extra clean" is always available.

## Design

One theme: light, teal, soft shadows. Every colour, radius and font is a CSS
custom property in `src/theme.css`, so no component hard-codes an appearance.
Two alternate token blocks (`ink`, `paper`) are kept in that file and switch on
with `<html data-theme="ink">` if the look ever needs to change.

Six icon candidates live in `scripts/icons.mjs` and render to `public/icons/`
for comparison: ring, broom, sparkle, calendar, bucket, check. The broom ships;
`ICON=sparkle npm run icons` swaps it.

**Changing the icon on phones that already installed the app:** iOS bakes the
icon in at "Add to Home Screen" and never updates it — those have to be removed
and re-added. Android Chrome refreshes the WebAPK on its own, but only after a
manifest check that happens roughly daily. The filename carries a version
(`icon-v3-*.png`) so browser and service-worker caches cannot serve stale
artwork; bump `ICON_VERSION` whenever the artwork changes.

## Data

```
entries/<pushId> = { date: "2026-08-30", name: "Siang Wei", createdAt: 1756... }
people/<pushId>  = { name: "Siang Wei", createdAt: 1756..., away?: true }
```

One key per entry. The old shape was a single array under one push key, read and
rewritten in full on every save, so two people logging at the same moment
silently overwrote each other. Deleting is now a single `DELETE`.

The roster is data, not code, so the People tab can change it without a deploy.
Removing someone deletes their `people` record only — their `entries` stay, so
history and past rounds are unaffected. Names that appear in history but are no
longer on the roster (Jason, who stopped in April 2025) simply drop out of the
queue.

`ProductList` is left in place, untouched, as a backup of the original data.
`scripts/migrate.mjs` copied 92 rows across, collapsing one exact duplicate
(Siang Wei logged twice on 30/08/2026) to 91 entries. It refuses to run twice.

## Whose turn is it?

Two questions, and only one of them is answerable. See `src/lib/rotation.ts`.

**Who still owes a turn this round** — solid. Checked against the real history,
the next person to clean was someone who still owed a turn **88%** of the time
(average 2.6 candidates). This is what the Schedule tab leads with.

**Which one of them goes first** — largely unknowable, because the order inside
a round is not fixed here. Measured on the 50 entries since the current roster
formed:

| Rule | Hit rate |
| --- | --- |
| Coin toss among everyone | ~46% |
| Longest wait overall | 49% |
| Longest wait among those who still owe a turn | **67%** |

Only Wan Fang keeps a strict slot (gaps of exactly 5 turns, every time). The
other four shuffle among themselves, so the app shows the longest-waiting of
those who still owe as a suggestion, never as the answer.

**Covering** is a fact, not a guess: someone taking a second turn while others
still owe one. That prompt fires on about 10% of logs, which matches how often
covering actually happens here. It explains and lets you continue.

**Away** exists because the queue is driven by how long someone has waited. A
person overseas for three months would otherwise sit pinned at the top of it the
whole time, wrongly, every day — verified: 122 days waited and top of the queue
while the other four were rotating normally. Marking them away drops them out of
the queue and the round, leaving a clean four-person rotation, and their history
is untouched.

Coming back stamps `since` with that date, and the wait is measured from
whichever is later, the last turn or the return. Otherwise they would rejoin
three months overdue and be called first on day one.

**People leaving** needs no special handling: Jason stopped in May 2025 and
simply is not on the roster, so he is out of the queue while his 5 cleans stay
in the history and in the old rounds.

## Still to do

**Database rules are wide open.** The app works exactly as it is — this is not
a bug to fix before shipping. But writes succeed with no auth, and the database
URL is readable in the shipped JavaScript, so anyone who views source can wipe
the roster with a single request. Lock it down in the Firebase console under
Realtime Database → Rules whenever convenient. Minimum viable version, and note
it has to allow every field the app writes (`for`, `away`, `since`) or those
writes start failing:

```json
{
  "rules": {
    "entries": {
      ".read": true,
      ".write": true,
      "$id": {
        ".validate": "newData.hasChildren(['date','name','createdAt'])",
        "date": { ".validate": "newData.isString() && newData.val().matches(/^\\d{4}-\\d{2}-\\d{2}$/)" },
        "name": { ".validate": "newData.isString() && newData.val().length < 40" },
        "for": { ".validate": "newData.isString() && newData.val().length < 40" },
        "createdAt": { ".validate": "newData.isNumber()" }
      }
    },
    "people": {
      ".read": true,
      ".write": true,
      "$id": {
        ".validate": "newData.hasChildren(['name','createdAt'])",
        "name": { ".validate": "newData.isString() && newData.val().length < 40" },
        "createdAt": { ".validate": "newData.isNumber()" },
        "away": { ".validate": "newData.isBoolean()" },
        "since": { ".validate": "newData.isString()" }
      }
    },
    "ProductList": { ".read": true, ".write": false }
  }
}
```

That still allows anonymous writes but blocks garbage shapes and freezes the
backup. Proper protection needs Firebase Auth.

**Deployment.** `.github/workflows/deploy.yml` in the old repo runs
`npm install && npm run build` and deploys `dist/`, which now matches this
project — it never could have worked against the old single HTML file. Point it
at this repo and it should run as written. `vite.config.ts` sets
`base: '/120-Cleaning-Schdule/'` for builds, matching the existing Pages URL.

**Everyone should reinstall the PWA** once this ships, so the new icon and name
take effect. On iPhone that is the only way.
