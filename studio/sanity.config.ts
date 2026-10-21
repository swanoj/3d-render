import { visionTool } from '@sanity/vision'
import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { ComingSaturdays } from './components/ComingSaturdays'
import { Logo } from './components/Logo'
import { dataset, projectId, siteUrl } from './env'
import { schemaTypes } from './schemaTypes'
import { singletons, structure } from './structure'
import { theme } from './theme'

/** Where each page document shows on the site, for "Open preview". */
const pagePaths = new Map([
  ['weekly', '/events'],
  ['ticketsPage', '/tickets'],
  ['birthdaysPage', '/birthdays'],
  ['boothsPage', '/booths'],
  ['faqPage', '/faqs'],
  ['settings', '/contact'],
])

/** The Club Casa back office. */
export default defineConfig({
  name: 'club-casa',
  title: 'Club Casa',
  projectId,
  dataset,
  icon: Logo,
  theme,
  plugins: [structureTool({ title: 'Content', structure }), visionTool({ title: 'Query' })],
  // Opening the back office adds the coming Saturdays the site already lists to Coming up.
  studio: { components: { layout: ComingSaturdays } },
  schema: {
    types: schemaTypes,
    // The page documents (Every Saturday, Tickets, Birthdays, Booths, FAQs, Venue & contact) already exist; the "new"
    // menu doesn't offer more of them.
    templates: (templates) => templates.filter(({ schemaType }) => !singletons.has(schemaType)),
  },
  document: {
    // A singleton can be published or reverted, never duplicated or deleted.
    actions: (actions, { schemaType }) =>
      singletons.has(schemaType)
        ? actions.filter(({ action }) => action === 'publish' || action === 'discardChanges' || action === 'restore')
        : actions,
    // "Open preview" in a document's menu: the page it publishes to.
    productionUrl: async (previous, { document }) => {
      const slug = (document.slug as { current?: string } | undefined)?.current
      if (document._type === 'night' && slug) return `${siteUrl}/events/${slug}`
      if (document._type === 'act' && slug) return `${siteUrl}/artists/${slug}`
      const path = pagePaths.get(document._type)
      return path ? `${siteUrl}${path}` : previous
    },
  },
})
