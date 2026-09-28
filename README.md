# Club Casa

The website for Club Casa, a club night upstairs at the Prince Bandroom, 29 Fitzroy Street, St Kilda.

Server-rendered with React Router 7 (the framework Remix became, which Shopify Hydrogen also runs on), with a WebGL "wordmark wall" behind every page, drawn with React Three Fiber, and deployed on Vercel.

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
| Nights: dates, line-ups, colourway, ticket links | `app/content/nights.ts` |
| Brand: palette, colourways, venue, house copy, nav | `app/brand/brand.ts` |
| Logos and marker strokes | `public/brand/*.svg` |
| Styles | `app/app.css` |

A night stays on the site after it happens and moves to the archive on `/nights`. Add a `ticketUrl` and set `status: 'on-sale'` to turn its button into **Tickets**; until then it points to the mailing list.

## Brand kit

Taken from the Alicyte Design asset set:

- **Colours:** Orange `#E95E27`, Charcoal `#212121`, Stone `#CCC6BA`, Cream `#EDE1D3`. These are sampled from the palette swatches; two of the hex labels printed on that sheet don't match their swatches.
- **Type:** Felt Tip Senior for the logo and hand-drawn display (Kalam stands in where Felt Tip Senior isn't installed, since it has no web licence here); Helvetica Bold for line-ups and labels (Arimo off Apple devices); Roboto Mono in capitals for body copy.
- **Colourways:** orange, cream and charcoal, from the posters. Each night has one; the page and the wall fade to it.
- **Marks:** the logo, stacked logo, submark, circled lockup and marker strokes in `public/brand/` were traced from screenshots of the asset set. Swap in the designer's master SVGs at the same filenames when they arrive.

## Environment

| Variable | Purpose |
| --- | --- |
| `NEWSLETTER_WEBHOOK_URL` | Where mailing-list sign-ups are POSTed as JSON (Klaviyo, Mailchimp, Zapier, Make or your own endpoint). Without it the form says sign-up isn't connected yet. |

## Deploy

Vercel project `3d-render` in the `os3` team, linked to this repository. `vercel.json` selects the React Router framework preset, so pages render in Vercel Functions. A push to `main` deploys production; every other branch gets a preview deployment.
