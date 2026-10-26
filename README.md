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
- **Club Casa after dark** (the easter egg): there's a door in the bottom-left of the home page's hero, with light thumping under it. Bring the pointer down there and it draws itself in, with Casa on the door behind a velvet rope; hold the pointer on it (press and hold on a phone, or hold Space) and it swings open. Casa's mates pour out (Casa and the eleven alternative mascots from the brand guideline, a couple of thousand of them) and the page becomes the club: the lights go down, beams sweep the walls, Casa-shaped gobos drift over the wordmarks, a mirror ball drops in, headings glow like neon, and the crowd dances at the foot of the screen. A conga line led by Casa parades along the top of the crowd (none of them chase the pointer, which only carries a soft spotlight to read by), scrolling fast lifts the energy, and every sixteen bars there's a drop. The club bar counts who's inside, plays Casa Radio (the crowd locks onto its kick), drops it, shares a link that opens the door for whoever gets it (`/#club`), and turns the lights on, when everyone runs home through the door. No flashing; under "reduce motion" it's a still scene.
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

## The back office

The team edits the site in **Sanity Studio**, a web app in `studio/` that Sanity hosts at https://clubcasa.sanity.studio (the site's `/admin` goes there too). Editors sign in with their Sanity account once they're invited to the project. It's laid out around the week:

- **Coming up** and **Past nights:** each night's date and doors, name, colourway and vinyl badge; the line-up in poster order (linked to acts' pages), its reveal phases and set times; tickets (not on sale, on sale with the link, sold out) and the price from; the poster, with a focal point for cropping, and photos from the night. The coming eight Saturdays are always there, just as the site shows them (doors at 10PM, wearing the weekly poster), ready to open and fill in: the seed script adds them, and so does opening the Studio (`studio/lib/weekly.ts`). **Cancelled** takes a night off the site. A new night is for a one-off on another date. Plain-English checks catch mistakes, like putting a night on sale without its ticket link.
- **Every Saturday:** doors and close (which are also the opening hours every page shows), and the weekly posters a Saturday takes in turn until it has its own.
- **Acts:** name, the line under it, bio, portrait, links and their Casa Radio mix.
- **Pages:** one for each page of the site, with its intro and the small label above its title. Home has the "Plan your night" cards; Tickets the ticketing partner and entry prices; Birthdays the packages; Booths the booths and VIP options (anything left empty there shows as "to be confirmed"); FAQs the questions in order (an unanswered one shows its placeholder and stays out of search results); Join the team the roles it's looking for.
- **Forms:** the wording of the birthday, booth, careers and contact forms: the heading, each field's label, hint and choices, the button and the thank-you. Which fields there are is set in code (`app/content/enquiries.ts`), and /api/enquiry checks submissions against the reworded form.
- **About Club Casa:** the tagline, the About text, the description search engines and shared links use, the share picture, and the mailing list's heading.
- **Venue & contact:** the venue's name and address (the map link follows it), the entry rule, the contact email, the Instagram handle and getting there.

The site reads what's published from Sanity's CDN (`app/lib/sanity.server.ts`, `app/content/cms.server.ts`), and it's on the site within a minute. Anything published replaces the content files' version (a night or act with the same slug, the FAQs and getting there once they're saved, and for the words, any field that's filled in: one left empty keeps the site's own), so the site works the same with Sanity connected or not. If Sanity can't be reached, pages carry on with the last content it sent, or the files.

```sh
cd studio
npm install
npx sanity login                  # once, in the browser
npm run dev                       # http://localhost:3333
npm run seed                      # copies what the site shows into the back office, field by field; never overwrites the team's edits
npm run deploy                    # publish the back office to clubcasa.sanity.studio
```

The Studio keeps itself on the latest Sanity release. Changing the content model (`studio/schemaTypes/`) needs a `npm run deploy`.

## Editing the site

| What | Where |
| --- | --- |
| Nights, the hours and weekly posters, acts, every page's words, the forms' wording, the tagline and About text, the venue, the contact email and Instagram, getting there | The back office (see above) |
| The words every page shares, the venue and the hours (until the back office has them) | `app/content/site.ts` |
| Events in code: announced nights, line-ups, reveal phases, set times, artwork, ticket links | `app/content/nights.ts` |
| The weekly posters used until a night has its own artwork (until the back office has them) | `app/content/artwork.ts`, images in `public/artwork/` |
| Each page's words: intros, the home page's cards, the roles, ticketing partner and prices, packages and booth options (until the back office has them) | `app/content/pages.ts` |
| Brand: palette, colourways, the name, the mascot, nav, contact email and Instagram (until the back office has them) | `app/brand/brand.ts` |
| FAQs and getting there | `app/content/faq.ts` |
| Enquiry forms (birthdays, booths, careers, contact): which fields, their checks, and their wording until the back office has it | `app/content/enquiries.ts` |
| Artist pages: bio, portrait, links, mix | `app/content/artists.ts` |
| Casa Radio's mixes | `app/content/radio.ts` |
| Photos from each night | `app/photos/<event slug>/` (see the README there) |
| Logos, emblem and mascot (official PNGs) | `public/brand/official/` |
| Marker strokes | `public/brand/*.svg` |
| Casa's shows (tickets, birthdays, booths) and the scroll effects | `app/components/PlanArt.tsx`, `NavPeek.tsx`, `ScrollFx.tsx`, `app/lib/scrollFx.ts` |
| The club easter egg: the door, the state, the WebGL scene and its shaders | `app/club/` (styles under "Club Casa after dark" in `app/app.css`) |
| Casa's mates, as sprite sheets (rebuilt with `python3 scripts/club-mates.py <guideline page 12>`) | `public/club/` |
| The home page's second version at /v2 (kept out of search results): the walk in, where the sound opens up as you scroll in from the street, and the crate of Saturdays beside Casa Radio's turntable | `app/routes/home-v2.tsx`, `app/lib/walkIn.ts`, `app/components/WalkIn.tsx`, `app/components/Crate.tsx` |
| Styles | `app/app.css` |
| Structured data, sitemap, robots.txt, llms.txt | `app/lib/structuredData.ts`, `app/routes/sitemap.ts`, `robots.ts`, `llms.ts` |
| The share card (until the back office has one) and analytics tags | `public/share/`, `app/components/SiteMeta.tsx`, `app/lib/analytics.ts` |

**The calendar fills itself in.** Club Casa runs every Saturday, so the site lists the next eight Saturdays as placeholders ("Club Casa", line-up to be announced, tickets soon), each with one of the brand's posts as its artwork. The back office keeps the same eight in Coming up, wearing the same posters, and a night marked Cancelled there leaves the calendar. To announce a night, add it in the back office, or to `app/content/nights.ts` under its date slug: whatever you give it (title, artwork, line-up, set times, `ticketUrl`) replaces the placeholder for that Saturday. Set `status: 'on-sale'` with a `ticketUrl` to turn its button into **Get tickets**, and `lineupConfirmed: true` once the line-up is real bookings. One-off nights on other days work the same way.

To hold names back, give an act a `phase` and the night a `phases` entry with the date it's revealed: `{ phase: 2, at: '2026-10-30T18:00:00+11:00' }`.

**Placeholders.** The brief asks for nothing to be invented: details that aren't confirmed yet show as a dashed "To be confirmed" placeholder until they're filled in. That's the contact email and Instagram (Venue & contact in the back office, or `brand.contact` in `app/brand/brand.ts`), entry prices (each night's "Tickets from", and Tickets in the back office), the ticketing partner (Tickets), birthday packages (Birthdays), booth options (Booths) and the dress code (the FAQs, in the back office or `app/content/faq.ts`, and on those pages).

## Brand kit

From the official Club Casa Brand Guideline (Alicyte Design):

- **Colours:** Orange `#E95E27`, Charcoal `#212121`, Stone `#CCC6BA`, Cream `#EDE1D3`, and nothing else. These are the swatch colours in the guideline (and in every post in the pack); two of the hex labels printed on the palette page (`#AA1F23`, `#EE2324`) don't match their swatches.
- **Colourways:** charcoal leads, as on the posts; cream is the paper stock for content and forms; orange is for moments (the mailing list, accents).
- **Type:** Felt Tip Senior, in capitals, for the hand-drawn display; Helvetica Neue Bold for line-ups and labels (Arimo off Apple devices); Roboto Mono in capitals for body copy. Felt Tip Senior is a licensed Mark Simonson font, so it isn't in this public repository: the WOFF2 is kept with the back office's files in Sanity and served from `/fonts/felt-tip-senior-regular.woff2` by `app/routes/font.ts` (the original TTF is in the branding pack's Fonts folder on Dropbox). Its `@font-face` in `app/app.css` scales it up 20%, since its capitals are shorter and wider than the stand-in the sizes were set with.
- **Marks:** the official logos, emblem and mascot from the pack, in `public/brand/official/`, trimmed to their artwork. Each is drawn as a mask in the current colour, so one file serves every colourway.
- **Mascot:** Casa (previously Otto).

## Environment

| Variable | Purpose |
| --- | --- |
| `SANITY_PROJECT_ID` | The back office's Sanity project. Without it the site uses the content files alone. |
| `SANITY_DATASET` | Its dataset, `production` unless set. |
| `SANITY_API_ORIGIN` | Testing only: a stand-in for Sanity's query API, to run the site against sample content. |
| `RESEND_API_KEY` | Secret. Turns on emailing enquiries to the team through Resend. |
| `ENQUIRY_EMAIL_TO` | Who gets the enquiry emails (comma-separated). Reply on one goes straight to the person who sent it. |
| `ENQUIRY_EMAIL_FROM` | The sender, on a domain verified in Resend, e.g. `Club Casa website <enquiries@clubcasa.com.au>`. Until one is verified, Resend's test sender only reaches the Resend account's own address. |
| `KLAVIYO_PRIVATE_API_KEY` | Secret. A Klaviyo private key with lists, profiles and subscriptions write access: mailing-list sign-ups go to Klaviyo with email marketing consent. |
| `KLAVIYO_LIST_ID` | The Klaviyo list they join. With double opt-in on, Klaviyo sends the confirmation email. |
| `NEWSLETTER_WEBHOOK_URL` | Also (or instead) POSTs sign-ups as JSON to a webhook: Mailchimp, Zapier, Make or your own endpoint. With neither this nor Klaviyo, the form says sign-up isn't connected yet. |
| `ENQUIRY_WEBHOOK_URL` | Also (or instead) POSTs enquiries as JSON (`{ kind, form, fields, submittedAt }`) to a webhook, e.g. Zapier or Make into a spreadsheet. With neither this nor Resend, the forms say enquiries aren't connected yet. |
| `SITE_URL` | The real public address, e.g. `https://clubcasa.com.au`. Canonical links, the sitemap and structured data use it, and every other host (previews, share copies) tells search engines not to index it. Without it, pages use the address they were requested on. |
| `GA_MEASUREMENT_ID` | Google Analytics 4 measurement ID (`G-…`). Without it Google Analytics stays off. |
| `GOOGLE_SITE_VERIFICATION` | The `content` of Search Console's HTML-tag verification. |
| `BING_SITE_VERIFICATION` | The `content` of Bing Webmaster Tools' `msvalidate.01` tag. |
| `GTM_CONTAINER_ID` | Google Tag Manager container (`GTM-…`). Loads Tag Manager on every page; see [Tag Manager and ad pixels](#tag-manager-and-ad-pixels). |
| `GOOGLE_ADS_ID` | Google Ads tag (`AW-…`), for remarketing audiences. |
| `META_PIXEL_ID` | Meta Pixel ID (Facebook and Instagram ads), the number in Meta Events Manager. |
| `TIKTOK_PIXEL_ID` | TikTok Pixel ID, from TikTok Events Manager. |
| `AD_CONSENT` | `denied` keeps Google's advertising cookies off even with the tags above set (they're granted once any is set, otherwise). |

## Search, AI assistants and analytics

- **For search engines:** a canonical link, share card (`public/share/club-casa.png`, or the event's poster) and Open Graph tags on every page; `/sitemap.xml` and `/robots.txt`, generated from the content; and schema.org data: the club, the site and the weekly series on the home page, the series with every coming night on `/events`, each night (venue, times, line-up, tickets) with breadcrumbs on its page, the FAQs, and each act.
- **For AI assistants:** `/llms.txt` sums up the club in plain Markdown (the facts, the coming nights, the answered FAQs and what isn't announced yet), and `robots.txt` names the AI search and training crawlers so they're explicitly welcome. Pages are server-rendered, so crawlers that don't run JavaScript read everything.
- **Analytics:** Vercel Web Analytics and Speed Insights (switch both on in the Vercel project's Analytics and Speed Insights tabs), and Google Analytics 4 with `GA_MEASUREMENT_ID`. GA counts page views itself as the address changes: leave Enhanced measurement on, as it is by default. Key moments go to both: `ticket_click`, `sign_up` (the mailing list), `generate_lead` (birthday, booth, careers and contact enquiries, with the form), `share` and `add_to_calendar`. Mark `ticket_click`, `sign_up` and `generate_lead` as key events in GA. Consent defaults allow measurement only, with no advertising cookies, until an ad tag is set (below).

## Tag Manager and ad pixels

Each one switches on by pasting its ID into an environment variable. Nothing in the code needs to change, and a tag whose variable is missing (or doesn't look like that platform's ID) stays off.

| Paste this | Into | Where to find it |
| --- | --- | --- |
| Google Tag Manager container ID, `GTM-XXXXXXX` | `GTM_CONTAINER_ID` | Tag Manager: the ID at the top of the workspace |
| Meta Pixel ID, e.g. `1234567890123456` | `META_PIXEL_ID` | Meta Events Manager → Data sources → the pixel → Settings |
| TikTok Pixel ID, e.g. `CABCDEFGHIJ1234567890` | `TIKTOK_PIXEL_ID` | TikTok Ads Manager → Tools → Events → Web events → the pixel |
| Google Ads tag ID, `AW-123456789` | `GOOGLE_ADS_ID` | Google Ads → Tools → Data manager → Google tag |
| GA4 measurement ID, `G-XXXXXXXXXX` | `GA_MEASUREMENT_ID` | Google Analytics → Admin → Data streams → the web stream |

**On Vercel:** open the project (`club-casa-v2` for the share link, `3d-render` for the main site) → **Settings → Environment Variables**, add each name and ID for Production (and Preview, to test on preview links), save, then **Deployments → ⋯ → Redeploy** the latest deployment, because variables only reach a new deployment. **Locally:** copy `.env.example` to `.env` and fill it in.

What reaches each one, besides page views (counted on every page, including the ones visitors move to without the page reloading):

| On the site | Google Analytics / Tag Manager | Meta Pixel | TikTok Pixel |
| --- | --- | --- | --- |
| Clicking **Get tickets** (to the ticketing site) | `ticket_click` | `InitiateCheckout` | `InitiateCheckout` |
| Sending a birthday, booth, careers or contact enquiry | `generate_lead` | `Lead` | `SubmitForm` |
| Joining the mailing list | `sign_up` | `CompleteRegistration` | `CompleteRegistration` |
| Sharing a page or the club | `share` | `Share` (custom) | |
| Adding a night to a calendar | `add_to_calendar` | `AddToCalendar` (custom) | |
| Getting into the club (the easter egg), by the door or a shared link | `club_open` | `ClubOpen` (custom) | |

The details travel with each event: `form` (`birthdays`, `booths`, `careers`, `contact`), `event` (the night), `method`, `content_type` and `item_id`. Meta and TikTok get them as `content_name`.

**In Tag Manager:** every key moment is a dataLayer event with the names above, so a Custom Event trigger on `ticket_click`, say, can fire any tag (LinkedIn, Snapchat, Pinterest, a Google Ads conversion). Pages after the first push a `page_view` event, so fire page-view tags on **All Pages** plus the custom event `page_view`. Set Google Analytics up in one place only: either `GA_MEASUREMENT_ID` here or a Google tag inside Tag Manager, not both, or GA counts everything twice. The same goes for adding the Meta or TikTok pixel inside Tag Manager as well as here.

**Google Ads conversions:** link Google Ads to Google Analytics and import the key events (`ticket_click`, `generate_lead`, `sign_up`), or build conversion tags in Tag Manager on the events above. The `GOOGLE_ADS_ID` tag itself is for remarketing audiences.

**Consent:** with any ad tag set, Google's advertising consent is granted by default (Australian privacy law doesn't currently require opt-in for these). Set `AD_CONSENT=denied` to keep Google's ad cookies off. The Meta and TikTok pixels don't follow Google's consent settings, so the privacy policy should say the site uses them. A consent banner would be the next step if the club ever advertises to the EU or UK.

## Deploy

Vercel project `3d-render` in the `os3` team, linked to this repository. `vercel.json` selects the React Router framework preset, so pages render in Vercel Functions. A push to `main` deploys production; every other branch gets a preview deployment.
