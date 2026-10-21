import { ClipboardIcon } from '@sanity/icons/Clipboard'
import { defineArrayMember, defineField, defineType } from 'sanity'

type FormFieldParent = { type?: string } | undefined

/**
 * The wording of an enquiry form: birthdays, booths, joining the team and contact. Which fields a form has (and what
 * they check) is set in the site's code (app/content/enquiries.ts), so fields can be reworded here but not added or
 * removed. Anything left empty keeps the site's own wording.
 */
export const enquiryForm = defineType({
  name: 'enquiryForm',
  title: 'Form',
  type: 'document',
  icon: ClipboardIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Heading',
      type: 'string',
      description: 'Above the form. A birthday or booth enquiry email is called this too.',
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'submit', title: 'Button', type: 'string', validation: (rule) => rule.required() }),
    defineField({
      name: 'sent',
      title: 'Thank-you message',
      type: 'text',
      rows: 2,
      description: 'Shown once it’s sent.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'fields',
      title: 'Fields',
      type: 'array',
      description: 'Each field’s wording, in the order the form shows them.',
      of: [
        defineArrayMember({
          name: 'formField',
          type: 'object',
          fields: [
            defineField({ name: 'name', type: 'string', hidden: true, readOnly: true }),
            defineField({ name: 'type', type: 'string', hidden: true, readOnly: true }),
            defineField({ name: 'label', title: 'Label', type: 'string', validation: (rule) => rule.required() }),
            defineField({
              name: 'placeholder',
              title: 'Hint inside the box',
              type: 'string',
              description: 'Optional, like "Optional".',
              hidden: ({ parent }) => ['select', 'saturday'].includes((parent as FormFieldParent)?.type ?? ''),
            }),
            defineField({
              name: 'options',
              title: 'Choices',
              type: 'array',
              description: 'The choices in the list, in order.',
              of: [defineArrayMember({ type: 'string' })],
              hidden: ({ parent }) => (parent as FormFieldParent)?.type !== 'select',
              validation: (rule) =>
                rule.custom((options, context) =>
                  (context.parent as FormFieldParent)?.type === 'select' && !(options as string[] | undefined)?.length
                    ? 'Give it at least one choice.'
                    : true,
                ),
            }),
          ],
          preview: {
            select: { title: 'label', placeholder: 'placeholder', options: 'options' },
            prepare: ({ title, placeholder, options }) => ({
              title,
              subtitle: ((options as string[] | undefined) ?? []).join(' · ') || placeholder,
            }),
          },
        }),
      ],
      options: { sortable: false, disableActions: ['add', 'addBefore', 'addAfter', 'duplicate', 'remove', 'copy'] },
    }),
  ],
  preview: { select: { title: 'title' } },
})
