# Club Casa

The website for Club Casa, every Saturday from 10PM until 5AM at the Prince Bandroom, 29 Fitzroy Street, St Kilda.

Server-rendered with React Router 7 (the framework Remix became, which Shopify Hydrogen also runs on), with a WebGL "wordmark wall" behind every page, drawn with React Three Fiber, and deployed on Vercel.

## What's on the site (v2)

Built from the official Club Casa Brand Guideline and branding pack (Alicyte Design), following the website brief: classy, minimal and analogue, with events and tickets first.

- **Home:** the tilted scribble logo, "A house away from home.", the hours and the way to tickets; then **Upcoming events**, with the next event given the most room and the following Saturdays as cards; the brand statement on cream; **Plan your night** (tickets, birthdays, booths); and where to find us.
- **Events** (`/events`, `/events/:slug`): every event with its artwork, date, line-up, **View event** and **Get tickets**. An event page has Add to calendar (`/events/:slug/calendar.ics`), Share, the countdown to doors, set times, photos and schema.org event data for search.
- **Tickets** (`/tickets`): each coming Saturday with its ticket button, and what to know about buying.
- **Birthdays** (`/birthdays`) and **Booths** (`/booths`): what's on offer and an enquiry form, with the coming Saturdays to choose from.
- **Join the team** (`/careers`): promoters, hosts and everyone else, with an application form.
- **Contact** (`/contact`): the venue details, opening hours, getting there and a general enquiry form.
- **FAQs** (`/faqs`): an accordion of the questions from the brief, with FAQ data for search.
- **Casa**, the mascot (previously Otto), walks along the bottom edge of every page: small and unhurried, stopping now and then to look around. Tap Casa for a hello. The waddle is two poses swapped in steps, like an old GIF, and Casa sits still under "reduce motion".
- **Hand-drawn layer:** marker underlines, rings and notes that draw themselves on scroll, the tilted logo "boiling" like a hand-drawn animation, and the emblem turning in clicks like a record label.
- **Casa's little shows** (GSAP): hover Tickets, Birthdays or Booths, in the header or under "Plan your night", and Casa performs. A Club Casa ticket rises out of a slot, gets Casa's "approved" stamp and loses its stub; bunting drops, Casa pops up in a party hat and the confetti goes off; the velvet rope unhooks, Casa walks into a booth and sits, the lamp comes on and the card says Reserved. On phones they play as they scroll into view. Headings stamp down letter by letter, cards drop in as you scroll and the hero drifts away. Under "reduce motion" everything shows its final frame.
- **Wordmark wall** behind every page, with warm lamp glows that fade in and out (no flashing).
- **Casa Radio** in the site header: tap to play four grooves synthesised in the browser; it keeps playing from page to page, with a 3D turntable in the corner.
- **Line-up reveals, artist pages and night-of mode** carry over from v1: names can go up in phases, acts link to their pages, and from doors until 5AM an event page shows who's on now. Add `?now=` to an address to preview a moment, e.g. `/?now=2026-10-24T23:30:00%2B11:00`.
- v1 addresses redirect: `/nights` → `/events`, `/nights/:slug` → `/events/:slug`, `/info` → `/faqs`.

v2 removes the Casa TV room and the playable DJ desk from v1, for the brief's more minimal approach. Both are in the git history (`main` before the v2 merge).

## Run it

Node.js 24 (see `.nvmrc`).

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # route types, type-check, then build to build/
npm run lint     # Oxlint
npm start        # serve the build on http://localhost:3000
```

## Editing the site

| What | Where |
| --- | --- |
| Events: announced nights, line-ups, reveal phases, set times, artwork, ticket links | `app/content/nights.ts` |
| The weekly posters used until a night has its own artwork | `app/content/artwork.ts`, images in `public/artwork/` |
| Brand: palette, colourways, hours, venue, contact email and Instagram, nav, copy | `app/brand/brand.ts` |
| FAQs and getting there | `app/content/faq.ts` |
| Enquiry forms (birthdays, booths, careers, contact): fields and messages | `app/content/enquiries.ts` |
| Artist pages: bio, portrait, links, mix | `app/content/artists.ts` |
| Casa Radio's mixes | `app/content/radio.ts` |
| Photos from each night | `app/photos/<event slug>/` (see the README there) |
| Logos, emblem and mascot (official PNGs) | `public/brand/official/` |
| Marker strokes | `public/brand/*.svg` |
| Casa's shows (tickets, birthdays, booths) and the scroll effects | `app/components/PlanArt.tsx`, `NavPeek.tsx`, `ScrollFx.tsx`, `app/lib/scrollFx.ts` |
| Styles | `app/app.css` |

**The calendar fills itself in.** Club Casa runs every Saturday, so the site lists the next eight Saturdays as placeholders ("Club Casa", line-up to be announced, tickets soon), each with one of the brand's posts as its artwork. To announce a night, add it to `app/content/nights.ts` under its date slug: whatever you give it (title, artwork, line-up, set times, `ticketUrl`) replaces the placeholder for that Saturday. Set `status: 'on-sale'` with a `ticketUrl` to turn its button into **Get tickets**, and `lineupConfirmed: true` once the line-up is real bookings. One-off nights on other days work the same way.

To hold names back, give an act a `phase` and the night a `phases` entry with the date it's revealed: `{ phase: 2, at: '2026-10-30T18:00:00+11:00' }`.

**Placeholders.** The brief asks for nothing to be invented: details that aren't confirmed yet show as a dashed "To be confirmed" placeholder until they're filled in. That's the contact email and Instagram (`brand.contact` in `app/brand/brand.ts`), entry prices, the ticketing partner, birthday packages, booth options and the dress code (in `app/content/faq.ts` and on those pages).

## Brand kit

From the official Club Casa Brand Guideline (Alicyte Design):

- **Colours:** Orange `#E95E27`, Charcoal `#212121`, Stone `#CCC6BA`, Cream `#EDE1D3`, and nothing else. These are the swatch colours in the guideline (and in every post in the pack); two of the hex labels printed on the palette page (`#AA1F23`, `#EE2324`) don't match their swatches.
- **Colourways:** charcoal leads, as on the posts; cream is the paper stock for content and forms; orange is for moments (the mailing list, accents).
- **Type:** Felt Tip Senior for the hand-drawn display (Kalam stands in: the font files weren't in the pack, so add them to `public/fonts/` with an `@font-face` in `app/app.css` when they arrive); Helvetica Neue Bold for line-ups and labels (Arimo off Apple devices); Roboto Mono in capitals for body copy.
- **Marks:** the official logos, emblem and mascot from the pack, in `public/brand/official/`, trimmed to their artwork. Each is drawn as a mask in the current colour, so one file serves every colourway.
- **Mascot:** Casa (previously Otto).

## Environment

| Variable | Purpose |
| --- | --- |
| `NEWSLETTER_WEBHOOK_URL` | Where mailing-list sign-ups are POSTed as JSON (Klaviyo, Mailchimp, Zapier, Make or your own endpoint). Without it the form says sign-up isn't connected yet. |
| `ENQUIRY_WEBHOOK_URL` | Where birthday, booth, careers and contact enquiries are POSTed as JSON (`{ kind, form, fields, submittedAt }`), e.g. a Zapier or Make webhook that emails the team. Without it the forms say enquiries aren't connected yet. |

## Deploy

Vercel project `3d-render` in the `os3` team, linked to this repository. `vercel.json` selects the React Router framework preset, so pages render in Vercel Functions. A push to `main` deploys production; every other branch gets a preview deployment.
