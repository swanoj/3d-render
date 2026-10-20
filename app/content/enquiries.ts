/*
 * The enquiry forms: birthdays, booths, joining the team and general contact. The page renders these fields and
 * /api/enquiry checks submissions against the same list, so a field only needs adding here.
 */

export type EnquiryKind = 'birthday' | 'booth' | 'careers' | 'contact'

export interface EnquiryField {
  name: string
  label: string
  type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'textarea' | 'saturday'
  required?: boolean
  autoComplete?: string
  placeholder?: string
  /** For selects. */
  options?: string[]
  min?: number
  max?: number
  /** Spans both columns of the form grid. */
  wide?: boolean
}

export interface Enquiry {
  /** The form's heading. */
  title: string
  submit: string
  /** Shown once it's sent. */
  sent: string
  fields: EnquiryField[]
}

/** The choice for a date that isn't one of the Saturdays listed. */
export const ANOTHER_DATE = 'Another date / not sure yet'

const contactFields: EnquiryField[] = [
  { name: 'name', label: 'Name', type: 'text', required: true, autoComplete: 'name' },
  { name: 'email', label: 'Email', type: 'email', required: true, autoComplete: 'email' },
  { name: 'phone', label: 'Phone', type: 'tel', required: true, autoComplete: 'tel' },
]

export const enquiries: Record<EnquiryKind, Enquiry> = {
  birthday: {
    title: 'Birthday enquiry',
    submit: 'Send enquiry',
    sent: 'Thanks. We’ve got your birthday enquiry and we’ll be in touch.',
    fields: [
      ...contactFields,
      { name: 'date', label: 'Preferred Saturday', type: 'saturday', required: true },
      { name: 'guests', label: 'Number of guests', type: 'number', required: true, min: 1, max: 500 },
      { name: 'celebrating', label: 'Whose birthday?', type: 'text', placeholder: 'Optional' },
      {
        name: 'message',
        label: 'Anything else we should know?',
        type: 'textarea',
        placeholder: 'Optional',
        wide: true,
      },
    ],
  },
  booth: {
    title: 'Booth enquiry',
    submit: 'Send enquiry',
    sent: 'Thanks. We’ve got your booth enquiry and we’ll come back to you with availability.',
    fields: [
      ...contactFields,
      { name: 'date', label: 'Preferred Saturday', type: 'saturday', required: true },
      { name: 'group', label: 'Group size', type: 'number', required: true, min: 1, max: 100 },
      { name: 'message', label: 'Anything else we should know?', type: 'textarea', placeholder: 'Optional', wide: true },
    ],
  },
  careers: {
    title: 'Apply',
    submit: 'Send application',
    sent: 'Thanks for getting in touch. We’ll be in touch if there’s a fit.',
    fields: [
      ...contactFields,
      {
        name: 'role',
        label: 'Interested in',
        type: 'select',
        required: true,
        options: ['Promoter', 'Host', 'Something else'],
      },
      { name: 'instagram', label: 'Instagram', type: 'text', placeholder: '@yourhandle (optional)' },
      {
        name: 'message',
        label: 'Tell us about yourself',
        type: 'textarea',
        required: true,
        placeholder: 'Experience, where you’ve worked, why Club Casa',
        wide: true,
      },
    ],
  },
  contact: {
    title: 'Send us a message',
    submit: 'Send message',
    sent: 'Thanks. We’ve got your message and we’ll get back to you.',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, autoComplete: 'name' },
      { name: 'email', label: 'Email', type: 'email', required: true, autoComplete: 'email' },
      { name: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel', placeholder: 'Optional' },
      {
        name: 'topic',
        label: 'About',
        type: 'select',
        required: true,
        options: ['General enquiry', 'Events and tickets', 'Birthdays', 'Booths', 'Media', 'Something else'],
      },
      { name: 'message', label: 'Message', type: 'textarea', required: true, wide: true },
    ],
  },
}

export function isEnquiryKind(value: unknown): value is EnquiryKind {
  return typeof value === 'string' && value in enquiries
}
