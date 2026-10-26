# Make it yours

Start with a working copy and change one area at a time. Keep the existing layout while replacing content; verify the phone view after each change.

| Change | Files |
| --- | --- |
| Introduction, title, resource links, phone frame and outside theme control | `public/phone.html` |
| Dates, phases/stops, places, food, booking metadata and coordinates | `public/app-data.json` |
| Date labels, short stories, date-to-palette mapping, opening date, storage keys | `public/trip-core.mjs` |
| Timeline rendering, navigation and theme schedule | `public/itinerary.mjs` and `public/itinerary.css` |
| Embedded maps and per-meal markers | `public/chapter-map.mjs`, `public/google-map-runtime.mjs`, `public/map/` |
| Searchable reference library and inventory | `public/reference.mjs`, `public/reference.css`, `public/inventory.mjs` |
| Booking cards and ticket notices | `public/booking-wallet.mjs`, `public/booking-wallet.css`, `public/demo.mjs`, `public/demo.css` |
| Browser-local journal, recovery drafts and illustrations | `public/journal.mjs`, `public/journal-drafts.mjs`, `public/journal.css` |
| Illustrated trip story | `public/trip-story.mjs` |
| Colour archive and editable original study panels | `public/colour-archive.html`, `public/colour-archive.json`, `public/palette-previews/` |
| Font files and notices | `public/fonts/` |

## Trip data

Each day has an `id`, ISO `date`, and `phases`, containing `stops`. Stops have stable `step_id` values and can refer to a `place` id. Preserve matching references across `places`, `points`, `mealChoices`, `bookingActions`, `details`, `stopDescriptions` and `mealAreas`. Keep coordinates in sync with the place. Search for the old date and place identifiers across the source when replacing them.

The runtime still contains Chicago-specific dates, timezone, routes and illustrations. For another city, update `DAY_DESIGN`, `resolveDay`, the phone iframe/start link, trip story, timezone helpers and map/transit data. Do not assume that editing a single JSON field converts every screen. Update the tests when you intentionally change the opening date.

## Palettes and typography

`app-data.json` contains exact light/dark CSS tokens for each palette. `DAY_DESIGN` assigns a palette to each day. Keep background/text pairs together for contrast. The current archive viewer embeds its record list as well as offering `colour-archive.json` for download; edit both when adding records. Historical panels are references, not the selected live palette.

The custom Trip Puff typeface is derived from DynaPuff; keep its OFL notice. Follow the font license and rename derivative fonts appropriately if modifying them further. Existing font provenance is in THIRD_PARTY_NOTICES.md.

## Bookings and journal

This public version deliberately replaces original document actions with a notice. To add your own booking workflow, change the wallet data and document actions together. Do not upload confirmations, personal documents or access tokens to public GitHub or a public static host. A private authenticated document service is a separate integration; iCloud sharing URLs do not become private simply because the button is hidden.

The journal uses browser-local storage and recovery drafts. It is not encrypted, server-backed or cross-device. Give your derivative unique storage keys in the modules to avoid mixing local data when hosted on the same origin. To offer sync, design and implement authentication and private storage separately.

## Verify before sharing

Check all dates in both themes, map pins and food scope, directions, reference search, ticket notices, journal save/reload, keyboard navigation, and narrow-screen layout. Inspect the actual exported files as well as the visible pages. Run the included checks, then test your own deployed hostname and your own device.
