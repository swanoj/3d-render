import { posterDate } from '../lib/format'
import type { Photo } from './types'

/*
 * Photos from each night. Drop images into app/photos/<night slug>/ (e.g. app/photos/2026-10-16/01.jpg) and they
 * appear on that night's page and in the home page's film strip, in file-name order. Keep faces out of frame: the
 * room stays a little mysterious.
 */
const files = import.meta.glob<string>('../photos/*/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
})

function nightName(slug: string) {
  const doors = `${slug}T22:00:00+11:00`
  return Number.isNaN(Date.parse(doors)) ? slug : posterDate(doors)
}

const all: Photo[] = Object.entries(files)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, src]) => {
    const slug = path.match(/photos\/([^/]+)\/[^/]+$/)?.[1] ?? ''
    return { src, alt: `Club Casa, ${nightName(slug)}`, nightSlug: slug }
  })

/** One night's photos, or without a slug the most recent night that has any. */
export function photosFor(nightSlug?: string) {
  const slug = nightSlug ?? all.map((photo) => photo.nightSlug ?? '').sort().pop()
  return slug ? all.filter((photo) => photo.nightSlug === slug) : []
}
