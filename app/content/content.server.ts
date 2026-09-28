import { RUNNING_TIME } from '../lib/nightOf'
import { artists } from './artists'
import { faq, gettingThere } from './faq'
import { houseRules, room } from './house'
import { nights } from './nights'
import { photosFor } from './photos'
import { mixes } from './radio'
import type { Act, Night, NightView, ShownAct } from './types'

/*
 * The content API route loaders call. It reads the typed files in this folder today; moving the schedule into a
 * CMS (the reference build uses Sanity) means replacing these bodies with queries and keeping the return types.
 */

/**
 * A night with its reveal phases applied at `now`: an act whose phase hasn't dropped comes back as a redacted
 * entry, and its name never reaches the page.
 */
function viewNight(night: Night, now: number): NightView {
  const dropAt = (act: Act) => (act.phase && act.phase > 1 ? night.phases?.find((p) => p.phase === act.phase)?.at : undefined)
  const hidden = (act: Act) => {
    const at = dropAt(act)
    return at !== undefined && Date.parse(at) > now
  }
  const acts: ShownAct[] = night.lineup.map((act) =>
    hidden(act)
      ? { hidden: true, phase: act.phase ?? 2, at: dropAt(act) ?? '' }
      : { hidden: false, name: act.name, artist: act.artist },
  )
  const drops = acts.flatMap((act) => (act.hidden ? [act.at] : [])).sort((a, b) => Date.parse(a) - Date.parse(b))
  const setTimes = (night.setTimes ?? []).map((set) => {
    const act = night.lineup.find((candidate) => candidate.name === set.act)
    const secret = act ? hidden(act) : false
    return { start: set.start, name: secret ? null : set.act, artist: secret ? undefined : act?.artist }
  })
  const { lineup, phases: _phases, setTimes: _sets, ...rest } = night
  return {
    ...rest,
    lineup: lineup.filter((act) => !hidden(act)).map((act) => act.name),
    acts,
    nextDrop: drops.length ? { at: drops[0], count: drops.filter((at) => at === drops[0]).length } : null,
    setTimes,
  }
}

export async function getNights(now = Date.now()) {
  const sorted = [...nights].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
  const upcoming = sorted.filter((night) => Date.parse(night.startsAt) + RUNNING_TIME > now)
  const past = sorted.filter((night) => Date.parse(night.startsAt) + RUNNING_TIME <= now).reverse()
  return { upcoming: upcoming.map((night) => viewNight(night, now)), past: past.map((night) => viewNight(night, now)) }
}

export async function getNight(slug: string, now = Date.now()) {
  const night = nights.find((candidate) => candidate.slug === slug)
  return night ? viewNight(night, now) : null
}

export async function getArtist(slug: string, now = Date.now()) {
  const artist = artists.find((candidate) => candidate.slug === slug)
  if (!artist) return null
  // The nights they play that have announced them.
  const { upcoming } = await getNights(now)
  const playing = upcoming.filter((night) => night.acts.some((act) => !act.hidden && act.artist === slug))
  const mix = artist.mix ? (mixes.find((candidate) => candidate.id === artist.mix) ?? null) : null
  return { artist, playing, mix }
}

export async function getHouse() {
  return { houseRules, room, photos: photosFor() }
}

export async function getPhotos(nightSlug: string) {
  return photosFor(nightSlug)
}

export async function getGuide() {
  return { faq, gettingThere }
}
