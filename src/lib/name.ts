/** "Siang Wei" -> "SW", used for the round avatars */
export function initials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}
