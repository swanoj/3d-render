import { HelpCircleIcon } from '@sanity/icons/HelpCircle'
import { defineArrayMember, defineField, defineType } from 'sanity'
import { introField, labelField } from './pages'

/**
 * The FAQ page, in order. A question without an answer shows its placeholder ("to be confirmed") on the site and
 * stays out of search results and the summary for AI assistants until it's answered.
 */
export const faqPage = defineType({
  name: 'faqPage',
  title: 'FAQs',
  type: 'document',
  icon: HelpCircleIcon,
  fields: [
    labelField('the FAQs page'),
    introField('the FAQs page'),
    defineField({
      name: 'items',
      title: 'Questions',
      type: 'array',
      description: 'Drag to reorder.',
      of: [
        defineArrayMember({
          name: 'faqItem',
          type: 'object',
          fields: [
            defineField({ name: 'question', title: 'Question', type: 'string', validation: (rule) => rule.required() }),
            defineField({
              name: 'answer',
              title: 'Answer',
              type: 'text',
              rows: 3,
              description: 'Leave it empty until it’s confirmed: the page shows the placeholder below instead.',
            }),
            defineField({
              name: 'pending',
              title: 'Until it’s answered',
              type: 'text',
              rows: 2,
              description: 'What the page says in the meantime, e.g. "The dress code will be posted here once it’s confirmed."',
            }),
            defineField({
              name: 'link',
              title: 'Link',
              type: 'object',
              description: 'Optional: where to go next.',
              fields: [
                defineField({ name: 'label', title: 'Label', type: 'string', description: '"Tickets", "Booth enquiry".' }),
                defineField({ name: 'to', title: 'Page', type: 'string', description: 'A page on the site: /tickets, /booths, /careers.' }),
              ],
              options: { collapsible: true, collapsed: true },
            }),
          ],
          preview: {
            select: { title: 'question', answer: 'answer' },
            prepare: ({ title, answer }) => ({ title, subtitle: answer ? 'Answered' : 'To be confirmed' }),
          },
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'FAQs' }) },
})
