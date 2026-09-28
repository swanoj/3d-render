import { houseRules, photos, room } from './house'
import { nights } from './nights'

/*
 * The content API route loaders call. It reads the typed files in this folder today; moving the schedule into a
 * CMS (the reference build uses Sanity) means replacing these bodies with queries and keeping the return types.
 */

/** A night counts as upcoming until 8 hours after doors, so it stays listed while it is on. */
const RUNNING_TIME = 8 * 60 * 60 * 1000

export async function getNights(now = Date.now()) {
  const sorted = [...nights].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
  const upcoming = sorted.filter((night) => Date.parse(night.startsAt) + RUNNING_TIME > now)
  const past = sorted.filter((night) => Date.parse(night.startsAt) + RUNNING_TIME <= now).reverse()
  return { upcoming, past }
}

export async function getNight(slug: string) {
  return nights.find((night) => night.slug === slug) ?? null
}

export async function getHouse() {
  return { houseRules, room, photos }
}
