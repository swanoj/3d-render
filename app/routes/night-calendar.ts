import type { Route } from './+types/night-calendar'
import { brand } from '../brand/brand'
import { getNight } from '../content/content.server'
import { clockTime } from '../lib/format'

/** Nights run "Late"; calendars get a five-hour entry. */
const LENGTH = 5 * 60 * 60 * 1000

/** 2026-10-16T11:00:00.000Z → 20261016T110000Z */
function stamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeText(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

/** RFC 5545 caps lines at 75 octets; longer ones continue on lines that start with a space. */
function fold(line: string) {
  const encoder = new TextEncoder()
  const parts: string[] = []
  let current = ''
  for (const char of line) {
    const limit = parts.length ? 74 : 75
    if (encoder.encode(current + char).length > limit) {
      parts.push(current)
      current = char
    } else {
      current += char
    }
  }
  parts.push(current)
  return parts.join('\r\n ')
}

/** An .ics file for one night, so "Add to calendar" works in every calendar app. */
export async function loader({ params, request }: Route.LoaderArgs) {
  const night = await getNight(params.slug)
  if (!night) throw new Response('Night not found', { status: 404 })

  const { venue } = brand
  const start = new Date(night.startsAt)
  const page = new URL(`/nights/${night.slug}`, request.url).href
  const lineup = night.lineupConfirmed && night.lineup.length ? ` With ${night.lineup.join(', ')}.` : ''
  const description = `${night.title}, ${clockTime(night.startsAt)} until ${night.closes.toLowerCase()}.${lineup} ${brand.entry} ${page}`

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Club Casa//Nights//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:club-casa-${night.slug}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(new Date(start.getTime() + LENGTH))}`,
    `SUMMARY:${escapeText(`${brand.name}: ${night.title}`)}`,
    `LOCATION:${escapeText(`${venue.name}, ${venue.street}, ${venue.locality}`)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `URL:${page}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  return new Response(`${lines.map(fold).join('\r\n')}\r\n`, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="club-casa-${night.slug}.ics"`,
      'Cache-Control': 'public, max-age=300',
    },
  })
}
