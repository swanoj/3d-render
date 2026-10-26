/*
 * The display face, Felt Tip Senior (Mark Simonson, licensed to Club Casa), served from the site's own address. The
 * file isn't in this repository, which is public: it's kept with the back office's assets in Sanity and passed
 * through here, so the browser loads it like any of the site's own fonts (cross-site fonts need CORS, which the
 * Sanity CDN only allows for listed sites). Vercel's CDN keeps a copy, so the function runs about once a deploy.
 */

/** The WOFF2, uploaded to the Club Casa Sanity project (ea9ln9aa). */
const SOURCE = 'https://cdn.sanity.io/files/ea9ln9aa/production/ad281287904a2c6350ebebad6e5e8274e647a82a.woff2'

export async function loader() {
  const response = await fetch(SOURCE, { signal: AbortSignal.timeout(8000) }).catch(() => null)
  if (!response?.ok) return new Response('Font unavailable', { status: 502, headers: { 'Cache-Control': 'no-store' } })
  return new Response(response.body, {
    headers: {
      'Content-Type': 'font/woff2',
      'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
    },
  })
}
