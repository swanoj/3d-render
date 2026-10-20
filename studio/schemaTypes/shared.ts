import { defineArrayMember, defineField } from 'sanity'

/** The three colourways from the brand guideline. */
export const moods = [
  { title: 'Charcoal', value: 'charcoal' },
  { title: 'Cream', value: 'cream' },
  { title: 'Orange', value: 'orange' },
]

const altField = defineField({
  name: 'alt',
  title: 'Description',
  type: 'string',
  description: 'What the image shows, in a sentence. Screen readers read it out and search engines index it.',
  validation: (rule) =>
    rule.custom((alt, context) => ((context.parent as { asset?: unknown } | undefined)?.asset && !alt ? 'Describe the image.' : true)),
})

/** An image with a focal point (so crops keep the important part) and a description. */
export function imageField(name: string, title: string, description: string, group?: string) {
  return defineField({ name, title, type: 'image', description, group, options: { hotspot: true }, fields: [altField] })
}

/** The same, as an item in a list of images. */
export const imageMember = defineArrayMember({ type: 'image', options: { hotspot: true }, fields: [altField] })
