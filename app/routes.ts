import { index, route, type RouteConfig } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  // The home page's second version, to compare: the walk in and the crate (see the route).
  route('v2', 'routes/home-v2.tsx'),
  route('events', 'routes/events.tsx'),
  route('events/:slug', 'routes/event.tsx'),
  route('events/:slug/calendar.ics', 'routes/event-calendar.ts'),
  route('tickets', 'routes/tickets.tsx'),
  route('birthdays', 'routes/birthdays.tsx'),
  route('booths', 'routes/booths.tsx'),
  route('careers', 'routes/careers.tsx'),
  route('contact', 'routes/contact.tsx'),
  route('faqs', 'routes/faqs.tsx'),
  route('artists/:slug', 'routes/artist.tsx'),
  route('api/newsletter', 'routes/api.newsletter.ts'),
  route('api/enquiry', 'routes/api.enquiry.ts'),
  // The display face, Felt Tip Senior, passed through from the back office's assets (see the route).
  route('fonts/felt-tip-senior-regular.woff2', 'routes/font.ts'),
  // For search engines and AI assistants.
  route('robots.txt', 'routes/robots.ts'),
  route('sitemap.xml', 'routes/sitemap.ts'),
  route('llms.txt', 'routes/llms.ts'),
  // v1 addresses, so old links and shared posts still land somewhere sensible.
  route('nights', 'routes/legacy.ts', { id: 'legacy-nights' }),
  route('nights/:slug', 'routes/legacy.ts', { id: 'legacy-night' }),
  route('nights/:slug/calendar.ics', 'routes/legacy.ts', { id: 'legacy-calendar' }),
  route('info', 'routes/legacy.ts', { id: 'legacy-info' }),
  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig
