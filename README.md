# My Chicago Itinerary

[Explore the live itinerary](https://ronzaum.github.io/my-chicago-itinerary/phone.html) · [How I built it](https://ronzaum.github.io/my-chicago-itinerary/article/index.html)

A personal, phone-first Chicago itinerary: daily plans, Google Maps, places and food, a booking wallet, a journal, and an archive of colour studies. I chose the colours and shaped the interface around how I like to travel.

This is the full editable source of the **public demo**, with a clean history. It preserves the design and public sightseeing content. Personal booking documents, accommodation details, flights, journal entries and owner credentials are not included.

## Try it locally

Install Node.js 20 or newer, then:

```sh
git clone https://github.com/ronzaum/my-chicago-itinerary.git
cd my-chicago-itinerary
npm start
```

No packages need installing. Open **http://127.0.0.1:4191/phone.html** for the phone presentation, or **http://127.0.0.1:4191/** for the itinerary itself. Both start on October 31. If the port is busy, run `PORT=4192 npm start` on macOS/Linux, or set the PORT environment variable on Windows.

## Build your own

Copy [STARTER-PROMPT.md](STARTER-PROMPT.md) into your coding assistant. It describes the design, functionality, palette rules and checks. [CUSTOMIZE.md](CUSTOMIZE.md) maps the editable files and explains the Chicago-specific parts that need changing for another trip.

The project is plain HTML, CSS and JavaScript modules. There is no compilation step or required framework. All app source is in `public/`; the archive includes the surviving original study HTML and downloadable palette tokens. This is an editable starting point, not a one-click trip generator.

Project workflows are in [.agents/skills](.agents/skills): explore, create-plan and execute. These are newly written, portable versions of the workflow, not private transcripts or proprietary instructions. How you invoke a skill depends on your assistant; `/explore` is not a universal built-in command.

## Enable embedded maps

Directions links work without configuration. The embedded Google Map needs **your own** browser API key. Copy `public/map-config.example.json` to `public/map-config.json`, then set `googleMapsKey`. The real file is ignored by Git.

Enable Maps JavaScript API, Places API (New), and Places UI Kit for your own project. Restrict the key to those APIs and your exact website referrers (including your chosen local port), and configure billing/quota controls in your account. Browser keys are visible to visitors: referrer and API restrictions matter. Never use a server secret here. See [Google Maps key security](https://developers.google.com/maps/api-security-best-practices).

## Data and privacy

Demo journal entries, choices and theme preferences are stored in the visitor’s browser. They are not sent to Ron and do not sync with iCloud. Booking buttons intentionally show a private-ticket notice. The original personal project opened files from Ron’s iCloud folder; those documents are not shared here. See [CUSTOMIZE.md](CUSTOMIZE.md) before adding your own documents or changing storage.

Public venue photos are linked from their original sources. Internet access is needed for these and Google services. This is not a fully offline application.

## Checks and hosting

```sh
npm run check
npm test
```

Upload the contents of `public/` to any static host. If maps are needed, provide `map-config.json` separately and restrict the key to the deployed hostname. The included GitHub Pages workflow publishes the static site. In your own repository, configure Pages and provide your own restricted map configuration as the PUBLIC_MAP_CONFIG_JSON Actions secret. No database is included. Keep private documents out of a public site. The map/venue information is a historical trip snapshot, not current travel advice.

## Reuse and credits

Original code and original design assets are MIT licensed: see [LICENSE](LICENSE). Third-party fonts, transit data and linked photographs retain their own terms; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). No AI model or subscription is required to run the site. You can use your preferred coding assistant to adapt it.
