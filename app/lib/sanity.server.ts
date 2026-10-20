import { createImageUrlBuilder, type ImageUrlBuilder } from '@sanity/image-url'

/*
 * The back office (Sanity Studio, in /studio) publishes to Sanity's Content Lake; the site reads published content
 * from its CDN. Two environment variables connect them:
 *
 *   SANITY_PROJECT_ID   The Sanity project's ID. Without it the site uses the content files in app/content.
 *   SANITY_DATASET      The dataset, "production" unless set.
 *
 * The dataset is public (it holds only what the site shows anyway), so reading needs no token. Queries are cached
 * for 30 seconds per server instance, so a publish shows on the site within a minute. If Sanity can't be reached,
 * pages carry on with the last content it sent, or the content files.
 */

const API_VERSION = '2025-02-19'
const FRESH_FOR = 30_000

export interface SanityImage {
  asset?: { _ref: string }
  crop?: unknown
  hotspot?: unknown
  alt?: string
}

function config() {
  const projectId = process.env.SANITY_PROJECT_ID?.trim()
  if (!projectId || !/^[a-z0-9-]+$/.test(projectId)) return null
  return { projectId, dataset: process.env.SANITY_DATASET?.trim() || 'production' }
}

/** The last answer to each query, and when it was fetched (or last failed, so an outage isn't retried every time). */
const cache = new Map<string, { at: number; result: unknown }>()
/** Queries on their way, so the several lookups one page makes share a single request. */
const inFlight = new Map<string, Promise<unknown>>()

async function fetchQuery<T>(url: string, stale: T | null) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!response.ok) throw new Error(`Sanity responded ${response.status}`)
    const { result } = (await response.json()) as { result: T }
    cache.set(url, { at: Date.now(), result })
    return result
  } catch (error) {
    console.error('Couldn’t reach Sanity, so pages use the last content it sent, or the content files.', error)
    // Try again in 30 seconds; until then, the last good answer (or nothing).
    cache.set(url, { at: Date.now(), result: stale })
    return stale
  } finally {
    inFlight.delete(url)
  }
}

/** A GROQ query against the published content, or null when Sanity isn't connected (or has never answered). */
export async function cmsQuery<T>(query: string): Promise<T | null> {
  const project = config()
  if (!project) return null
  // SANITY_API_ORIGIN points at a stand-in API, for testing the site against sample content.
  const origin = process.env.SANITY_API_ORIGIN?.trim() || `https://${project.projectId}.apicdn.sanity.io`
  const url = `${origin}/v${API_VERSION}/data/query/${project.dataset}?query=${encodeURIComponent(query)}`
  const cached = cache.get(url)
  if (cached && Date.now() - cached.at < FRESH_FOR) return cached.result as T | null
  let pending = inFlight.get(url) as Promise<T | null> | undefined
  if (!pending) {
    pending = fetchQuery<T>(url, (cached?.result as T | undefined) ?? null)
    inFlight.set(url, pending)
  }
  return pending
}

let builder: ImageUrlBuilder | null = null

/** A CDN address for an image from the back office, cropped around its hotspot when both sides are given. */
export function cmsImageUrl(image: SanityImage | undefined, width: number, height?: number) {
  const project = config()
  if (!project || !image?.asset?._ref) return undefined
  builder ??= createImageUrlBuilder(project)
  const sized = builder.image(image).width(width).auto('format').quality(82)
  return (height ? sized.height(height).fit('crop') : sized).url()
}
