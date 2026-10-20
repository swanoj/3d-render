import { visionTool } from '@sanity/vision'
import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { Logo } from './components/Logo'
import { dataset, projectId, siteUrl } from './env'
import { schemaTypes } from './schemaTypes'
import { singletons, structure } from './structure'
import { theme } from './theme'

/** The Club Casa back office. */
export default defineConfig({
  name: 'club-casa',
  title: 'Club Casa',
  projectId,
  dataset,
  icon: Logo,
  theme,
  plugins: [structureTool({ title: 'Content', structure }), visionTool({ title: 'Query' })],
  schema: {
    types: schemaTypes,
    // The FAQs and Venue & contact pages already exist; the "new" menu doesn't offer more of them.
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
      if (document._type === 'faqPage') return `${siteUrl}/faqs`
      if (document._type === 'settings') return `${siteUrl}/contact`
      return previous
    },
  },
})
