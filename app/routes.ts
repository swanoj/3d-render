import { index, route, type RouteConfig } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  route('nights', 'routes/nights.tsx'),
  route('nights/:slug', 'routes/night.tsx'),
  route('nights/:slug/calendar.ics', 'routes/night-calendar.ts'),
  route('info', 'routes/info.tsx'),
  route('api/newsletter', 'routes/api.newsletter.ts'),
  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig
