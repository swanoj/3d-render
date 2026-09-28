# Club Casa

The website for Club Casa, a club night upstairs at the Prince Bandroom, 29 Fitzroy Street, St Kilda.

Server-rendered with React Router 7 (the framework Remix became, which Shopify Hydrogen also runs on), with a WebGL "wordmark wall" behind every page, drawn with React Three Fiber, and deployed on Vercel.

## What's on the site

Built from the Alicyte Design asset set and the Prince Bandroom concept deck:

- **Casa TV** (home page): a 3D corner of the room with a walnut console TV, a floor lamp and a table lamp whose light slowly breathes, a plant, hanging records, a crate of records, a security camera on the ceiling, and dust and haze in the lamplight. The section pins while you scroll, the site header steps aside, and the camera walks in from the doorway until the set fills the screen. Tap the set, use CH − / CH +, or press ← / → or 1–6 to change channel: next night, line-up, house rules, vinyl nights, test card, and Casa Cam, a live picture of the room from the ceiling camera (the set is in its own shot, so it shows a tunnel of itself). Click a lamp, or press L, to switch the lamps. The Sound button, the set's volume knob or M turns on the room's sound: the club through the wall, static between channels, crackle on the vinyl channel. It's synthesised with Web Audio in `app/lib/casaSound.ts`, and the lamps swell gently with each kick. Reflections, bloom, ambient occlusion and depth of field run on capable devices and step down automatically when frames drop (`?quality=low` or `?quality=high` pins it). It loads only when scrolled near, pauses off screen, and falls back to a flat 2D set without WebGL.
- **Wordmark wall** behind every page, in each night's colourway, with warm lamp glows that fade in and out (no flashing).
- **Hand-drawn layer:** notes and arrows ("save the date", "pop it in the diary") that draw themselves on scroll, a doodle stamp for each night, a circled "All vinyl" badge, and a handwritten house-rules card on `/info`.
- **Film strip** of photos from past nights, faded and grainy. Until there are photos, the frames show as still developing.
- **Night pages:** Add to calendar (`/nights/:slug/calendar.ics`), Share (system share sheet, or copies the link), and schema.org event data for search.
- **Page changes** fold the picture into a line and open the next one, like changing channel. All motion is reduced or off under "reduce motion".

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
| Nights: dates, line-ups, colourway, doodle, vinyl nights, ticket links | `app/content/nights.ts` |
| House rules, "The room" copy, photos for the film strip | `app/content/house.ts` |
| Brand: palette, colourways, venue, house copy, nav | `app/brand/brand.ts` |
| Casa TV channels | `app/three/channels.ts` |
| Casa TV sound: tempo, chords, levels | `app/lib/casaSound.ts` |
| Logos and marker strokes | `public/brand/*.svg` |
| Styles | `app/app.css` |

A night stays on the site after it happens and moves to the archive on `/nights`. Add a `ticketUrl` and set `status: 'on-sale'` to turn its button into **Tickets**; until then it points to the mailing list. Set `lineupConfirmed: true` once the line-up is real bookings: until then the names stay out of search results and calendar files, and the page notes "more names soon".

The schedule in `app/content/nights.ts` and the house rules in `app/content/house.ts` are placeholders until they're confirmed.

## Brand kit

Taken from the Alicyte Design asset set:

- **Colours:** Orange `#E95E27`, Charcoal `#212121`, Stone `#CCC6BA`, Cream `#EDE1D3`. These are sampled from the palette swatches; two of the hex labels printed on that sheet don't match their swatches. The concept deck adds dark pink `#93304F` and red `#AA1F23` as supporting tones, and a subdued green `#4F5B3A` for plants.
- **Type:** Felt Tip Senior for the logo and hand-drawn display (Kalam stands in where Felt Tip Senior isn't installed, since it has no web licence here); Helvetica Bold for line-ups and labels (Arimo off Apple devices); Roboto Mono in capitals for body copy.
- **Colourways:** orange, cream and charcoal from the posters, plus red and pink from the concept deck. Each night has one; the page and the wall fade to it.
- **Marks:** the logo, stacked logo, submark, circled lockup and marker strokes in `public/brand/` were traced from screenshots of the asset set. Swap in the designer's master SVGs at the same filenames when they arrive.

## Environment

| Variable | Purpose |
| --- | --- |
| `NEWSLETTER_WEBHOOK_URL` | Where mailing-list sign-ups are POSTed as JSON (Klaviyo, Mailchimp, Zapier, Make or your own endpoint). Without it the form says sign-up isn't connected yet. |

## Deploy

Vercel project `3d-render` in the `os3` team, linked to this repository. `vercel.json` selects the React Router framework preset, so pages render in Vercel Functions. A push to `main` deploys production; every other branch gets a preview deployment.
