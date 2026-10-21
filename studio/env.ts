/*
 * Which Sanity project the back office edits: Club Casa (ea9ln9aa, in the "Oliver Swan" organization). The project ID
 * isn't a secret: the site sends it with every request. SANITY_STUDIO_PROJECT_ID (and SANITY_STUDIO_DATASET,
 * "production" by default) in studio/.env point a local copy somewhere else.
 */
export const projectId = process.env.SANITY_STUDIO_PROJECT_ID || 'ea9ln9aa'
export const dataset = process.env.SANITY_STUDIO_DATASET || 'production'

/** Where "Open on the site" goes. */
export const siteUrl = (process.env.SANITY_STUDIO_SITE_URL || 'https://club-casa-v2.vercel.app').replace(/\/$/, '')
