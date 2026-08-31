// App icons. `npm run icons` renders every candidate into public/icons/ so they
// can be compared side by side, then writes the one named by ICON as the
// shipped icon-<version>-192/512.png.
//
// Rules of thumb these are drawn to: one strong shape, filling roughly 70% of
// the canvas, no stroke thinner than ~16px at 512, no detail that disappears at
// the ~50px a home screen actually renders.
import { Resvg } from '@resvg/resvg-js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Change these two once a design is picked. Bumping the version matters:
 * phones cache the icon file hard, so a new filename is the only reliable way
 * to make an already-installed app pick up new artwork.
 */
const ICON = process.env.ICON ?? 'broom'
const ICON_VERSION = process.env.ICON_VERSION ?? 'v3'

const S = 512
const R = 114 // squircle-ish corner, close to what iOS masks to anyway

// Palette follows the app's teal theme so the icon and the UI read as one thing
const TEAL = '#0ea5a4'
const TEAL_DEEP = '#0b6f6e'
const MINT = '#a7f3ec'
const CREAM = '#fffdf6'
const AMBER = '#fbbf24'

const gradient = (id, from, to, vertical = true) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="1">
     <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
   </linearGradient>`

const plate = (fill) => `<rect width="${S}" height="${S}" rx="${R}" fill="${fill}"/>`

/** Soft light falling from the top-left, so the plate is not a flat slab */
const sheen = `<path d="M0 ${R}a${R} ${R} 0 0 1 ${R}-${R}h${S - R * 2}a${R} ${R} 0 0 1 ${R} ${R}v150c-120 70-280 90-${S} 30z"
  fill="#ffffff" opacity=".07"/>`

/** Four-point sparkle centred at cx,cy */
function sparkle(cx, cy, r) {
  const a = r * 0.1
  const b = r * 0.36
  return `M${cx} ${cy - r}
    C${cx + a} ${cy - b} ${cx + b} ${cy - a} ${cx + r} ${cy}
    C${cx + b} ${cy + a} ${cx + a} ${cy + b} ${cx} ${cy + r}
    C${cx - a} ${cy + b} ${cx - b} ${cy + a} ${cx - r} ${cy}
    C${cx - b} ${cy - a} ${cx - a} ${cy - b} ${cx} ${cy - r}Z`
}

const designs = {
  // A. Ring — five people on a circle, one lit up, arrow carrying the turn
  //    forward. The only candidate that says "rotation" rather than "cleaning".
  ring: {
    label: 'Ring — whose turn',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">
      <defs>${gradient('bg', '#12b0ae', TEAL_DEEP)}</defs>
      ${plate('url(#bg)')}${sheen}
      <circle cx="256" cy="262" r="132" fill="none" stroke="${CREAM}" stroke-width="24" stroke-opacity=".2"/>
      <!-- One 72° step of the ring lit up: the turn moving on by one person -->
      <path d="M256 130A132 132 0 0 1 381.5 221.2" fill="none" stroke="${MINT}" stroke-width="24" stroke-linecap="round"/>
      ${[1, 2, 3, 4].map((i) => {
        const a = (-90 + i * 72) * (Math.PI / 180)
        return `<circle cx="${(256 + Math.cos(a) * 132).toFixed(1)}" cy="${(262 + Math.sin(a) * 132).toFixed(1)}" r="26" fill="${MINT}"/>`
      }).join('')}
      <circle cx="256" cy="130" r="48" fill="${TEAL_DEEP}"/>
      <circle cx="256" cy="130" r="37" fill="${AMBER}"/>
    </svg>`,
  },

  // B. Broom — the most literal read of "cleaning"
  broom: {
    label: 'Broom',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">
      <defs>${gradient('bg', '#12b0ae', TEAL_DEEP)}</defs>
      ${plate('url(#bg)')}${sheen}
      <g transform="rotate(-30 256 256)">
        <rect x="238" y="96" width="36" height="176" rx="18" fill="${CREAM}"/>
        <path d="M176 268h160c12 0 21 10 19 22l-9 56H166l-9-56c-2-12 7-22 19-22z" fill="${CREAM}"/>
        <path d="M166 350h180l12 54c2 11-6 20-17 20H171c-11 0-19-9-17-20z" fill="${AMBER}"/>
        <g stroke="${TEAL_DEEP}" stroke-width="9" stroke-linecap="round" opacity=".45">
          <path d="M203 362v46M241 362v46M279 362v46M317 362v46"/>
        </g>
      </g>
    </svg>`,
  },

  // C. Sparkle — the result rather than the tool. Cleanest at small sizes.
  sparkle: {
    label: 'Sparkle',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">
      <defs>${gradient('bg', '#14bdb0', '#0a6d70')}</defs>
      ${plate('url(#bg)')}${sheen}
      <path d="${sparkle(238, 262, 148)}" fill="${CREAM}"/>
      <path d="${sparkle(372, 148, 62)}" fill="${AMBER}"/>
      <path d="${sparkle(378, 358, 44)}" fill="${MINT}"/>
    </svg>`,
  },

  // D. Calendar — leads on the record-keeping, reads well on a light home screen
  calendar: {
    label: 'Calendar',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">
      <defs>${gradient('bg', '#f7fafc', '#dfe8ee')}</defs>
      ${plate('url(#bg)')}
      <rect x="84" y="126" width="344" height="304" rx="52" fill="${TEAL}"/>
      <path d="M84 178a52 52 0 0 1 52-52h240a52 52 0 0 1 52 52v34H84z" fill="${TEAL_DEEP}"/>
      <g fill="${CREAM}">
        <rect x="150" y="88" width="38" height="86" rx="19"/>
        <rect x="324" y="88" width="38" height="86" rx="19"/>
      </g>
      <g fill="${MINT}" opacity=".7">
        <circle cx="160" cy="272" r="22"/><circle cx="238" cy="272" r="22"/>
        <circle cx="160" cy="348" r="22"/>
      </g>
      <circle cx="330" cy="330" r="86" fill="${AMBER}"/>
      <path d="M296 331l26 27 48-56" fill="none" stroke="#0f2b2b" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },

  // E. Bucket — warmer and more domestic than the broom
  bucket: {
    label: 'Bucket',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">
      <defs>${gradient('bg', '#12b0ae', TEAL_DEEP)}</defs>
      ${plate('url(#bg)')}${sheen}
      <path d="M148 236h216l-26 168c-2 15-15 26-30 26H204c-15 0-28-11-30-26z" fill="${CREAM}"/>
      <path d="M156 296h200l-8 52H164z" fill="${MINT}"/>
      <path d="M172 236c0-46 38-84 84-84s84 38 84 84" fill="none" stroke="${AMBER}" stroke-width="24" stroke-linecap="round"/>
      <circle cx="356" cy="150" r="34" fill="${MINT}" opacity=".85"/>
      <circle cx="404" cy="220" r="20" fill="${MINT}" opacity=".6"/>
    </svg>`,
  },

  // F. Check — plainest of the set, reads instantly, says nothing specific
  check: {
    label: 'Check',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">
      <defs>${gradient('bg', '#12b0ae', TEAL_DEEP)}</defs>
      ${plate('url(#bg)')}${sheen}
      <circle cx="256" cy="256" r="150" fill="${CREAM}"/>
      <path d="M188 258l48 50 92-104" fill="none" stroke="${TEAL}" stroke-width="42" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },
}

const render = (svg, size) =>
  new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()

mkdirSync(resolve(root, 'public/icons'), { recursive: true })

for (const [id, d] of Object.entries(designs)) {
  writeFileSync(resolve(root, `public/icons/${id}-512.png`), render(d.svg, 512))
  console.log(`preview  public/icons/${id}-512.png  (${d.label})`)
}

const chosen = designs[ICON]
if (!chosen) {
  throw new Error(`Unknown icon "${ICON}". Options: ${Object.keys(designs).join(', ')}`)
}
for (const size of [192, 512]) {
  const file = `icon-${ICON_VERSION}-${size}.png`
  writeFileSync(resolve(root, `public/${file}`), render(chosen.svg, size))
  console.log(`shipped  public/${file}  <- ${chosen.label}`)
}
