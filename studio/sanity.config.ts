import { visionTool } from '@sanity/vision'
import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { ComingSaturdays } from './components/ComingSaturdays'
import { Logo } from './components/Logo'
import { dataset, projectId, siteUrl } from './env'
import { schemaTypes } from './schemaTypes'
import { fixedTypes, structure } from './structure'
import { theme } from './theme'

/** Where each fixed document shows on the site, for "Open preview". */
const pagePaths = new Map([
  ['weekly', '/events'],
  ['homePage', '/'],
  ['eventsPage', '/events'],
  ['ticketsPage', '/tickets'],
  ['birthdaysPage', '/birthdays'],
  ['boothsPage', '/booths'],
  ['faqPage', '/faqs'],
  ['contactPage', '/contact'],
  ['careersPage', '/careers'],
  ['form-birthday', '/birthdays'],
  ['form-booth', '/booths'],
  ['form-careers', '/careers'],
  ['form-contact', '/contact'],
  ['about', '/'],
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
    // The pages, forms and the rest are set up already (by the seed script); the "new" menu doesn't offer more of them.
    templates: (templates) => templates.filter(({ schemaType }) => !fixedTypes.has(schemaType)),
  },
  document: {
    // A fixed document can be published or reverted, never duplicated or deleted.
    actions: (actions, { schemaType }) =>
      fixedTypes.has(schemaType)
        ? actions.filter(({ action }) => action === 'publish' || action === 'discardChanges' || action === 'restore')
        : actions,
    // "Open preview" in a document's menu: the page it publishes to.
    productionUrl: async (previous, { document }) => {
      const slug = (document.slug as { current?: string } | undefined)?.current
      if (document._type === 'night' && slug) return `${siteUrl}/events/${slug}`
      if (document._type === 'act' && slug) return `${siteUrl}/artists/${slug}`
      const path = pagePaths.get(document._id.replace(/^drafts\./, '')) ?? pagePaths.get(document._type)
      return path ? `${siteUrl}${path}` : previous
    },
  },
})
