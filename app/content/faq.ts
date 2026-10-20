/*
 * The FAQ page, from the website brief. An answer that depends on venue information or a policy that isn't confirmed
 * yet is left `pending`: the page shows it as a marked placeholder, and it stays out of the search-engine FAQ data,
 * until the answer is written in.
 */

export interface FaqItem {
  question: string
  /** The answer, once it's confirmed. */
  answer?: string
  /** What the placeholder says until then. */
  pending?: string
  /** Where to go next. */
  link?: { label: string; to: string }
}

export const faq: FaqItem[] = [
  {
    question: 'What is the dress code?',
    pending: 'The dress code will be posted here once it’s confirmed.',
  },
  {
    question: 'What are Club Casa’s opening hours?',
    answer: 'Every Saturday, from 10PM until 5AM Sunday.',
  },
  {
    question: 'How do I purchase entry or tickets?',
    answer:
      'Tickets for each Saturday are sold online. Go to Tickets, or to the event you’re coming to, and tap Get tickets once they’re on sale. Get on the list to hear first when they are.',
    link: { label: 'Tickets', to: '/tickets' },
  },
  {
    question: 'How much does entry cost?',
    pending: 'Entry prices will be confirmed and shown with each event’s tickets.',
    link: { label: 'Upcoming events', to: '/events' },
  },
  {
    question: 'What is included in the birthday packages?',
    pending: 'Birthday package inclusions are still being finalised. Send a birthday enquiry and we’ll be in touch with what’s on offer.',
    link: { label: 'Birthday enquiry', to: '/birthdays' },
  },
  {
    question: 'How can I become a promoter or host?',
    answer: 'Apply through Join the team. Tell us a bit about yourself and we’ll be in touch.',
    link: { label: 'Join the team', to: '/careers' },
  },
  {
    question: 'How do I book a booth?',
    answer: 'Send a booth enquiry with your date and group size, and we’ll get back to you with availability.',
    link: { label: 'Booth enquiry', to: '/booths' },
  },
  {
    question: 'How old do I need to be?',
    answer: '18 or over, with valid photo ID.',
  },
]

/** Getting to the Prince Bandroom: general transport notes, shown on the contact page. */
export const gettingThere = [
  {
    label: 'Tram',
    text: 'Trams run along Fitzroy Street and stop outside the Prince. Late at night, check PTV for Night Network services home.',
  },
  { label: 'Ride share or taxi', text: 'Ask to be dropped on Fitzroy Street, at the Prince Bandroom.' },
  { label: 'Driving', text: 'Parking around St Kilda is limited and metered. The tram is easier.' },
]
