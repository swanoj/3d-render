/*
 * Which Sanity project the back office edits. The project ID isn't a secret: the site sends it with every request.
 * Set SANITY_STUDIO_PROJECT_ID (and SANITY_STUDIO_DATASET, "production" by default) in studio/.env for local work,
 * or replace the fallback below once the project exists.
 */
export const projectId = process.env.SANITY_STUDIO_PROJECT_ID || 'replace-with-project-id'
export const dataset = process.env.SANITY_STUDIO_DATASET || 'production'

/** Where "Open on the site" goes. */
export const siteUrl = (process.env.SANITY_STUDIO_SITE_URL || 'https://club-casa-v2.vercel.app').replace(/\/$/, '')
