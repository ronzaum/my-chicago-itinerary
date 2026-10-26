# Build your own itinerary

Build a personal travel app closely matching My Chicago Itinerary: a compact, phone-first Chicago itinerary with playful type, strong day palettes, real Google Maps and a paper-ticket booking wallet.

START HERE
If I provide the clean public repository, clone it into a separate project and preserve its components, typography, spacing, illustrations, colours and interactions. Replace trip content through its data layer. Never clone a private repository or copy private history, credentials or documents. If no repository is available, say that a prompt cannot guarantee an exact copy. Build from this specification and ask for a reference screenshot only when needed to resolve a concrete visual ambiguity.

Ask for my destination, dates, confirmed bookings, accommodation, travel times, interests, food preferences and document links. Keep unknown details blank. Do not invent bookings, ratings, links or opening hours. Keep tour and flight times fixed. Fit optional activities and nearby food around them. This is a personal tool, not a multi-user service.

MY COMMAND WORKFLOW
Ron used installed custom skills named explore, create-plan and execute. Slash-style names: /explore, /create-plan, /execute. These are not universal built-in commands. In the recorded Codex setup, skills were invoked with $explore, $create-plan and $execute <plan-file>.
If those skills are installed, read and use them. If unavailable, use the following normal-language equivalents without pretending to have installed or executed a skill:
1. Explore: inspect the existing code, data and design. Identify the source of truth and dependencies. Clarify only material ambiguities. Do not redesign yet.
2. Create-plan: write a bounded implementation plan with accepted design choices, tasks and checks. Preserve the original reference alongside alternatives.
3. Execute: implement that plan, track progress and test the real flows. Continue through routine implementation decisions. Ask before external publication, new paid services or exposing private information.
These are workflow summaries, not redistributed original skill files.

PROJECT RULES
Read AGENTS.md and PROJECT_MEMORY.md when present. Keep concise standing instructions in AGENTS.md and current accepted decisions in PROJECT_MEMORY.md; mark superseded choices clearly. Separate maintained source, generated output and public-demo files. Preserve the private app when making a public derivative.

VISUAL SPECIFICATION
Use the repository's bundled custom Trip Puff Open wordmark font and editorial interface font, retaining their licence notices. If the source/fonts are unavailable, explain the fallback rather than claiming an exact match. Compact app header: journal icon, centred wordmark, inventory icon. Date tabs, Day view / Map view, short day banner, then the timeline. Keep 16px outer gutters, aligned inner content, fine timeline line/dots, concise two-line rows and compact icon actions. Map and directions controls use quiet outlined edges; ticket actions retain the ticket silhouette, punched notches, perforation and ticket icon. Do not flatten them into generic cards.
Use a separate palette per day with matching text tokens and both light and dark modes. Colour inspiration: blue from Virgil Abloh’s book, yellow from Frank Lloyd Wright’s stained glass, cherry from Mies’s steel and OMA’s McCormick Tribune Campus Center at IIT. Use exact source palettes listed below; do not create new shades. Preserve source-approved neutral action outlines and original published map styling. Sightseeing and practical/meal rows have distinct fills. Dark mode separates dark date navigation, midtone view navigation and a brighter day banner. Compare the same content when showing design alternatives.

FUNCTIONS
- Daily itinerary with timings, travel notes, optional stops and detail pages. Preserve confirmed constraints.
- Google Maps with public venue markers, clustering, day/chapter focus, venue cards, zoom, expanded map and directions. Meal maps show only that specific meal's choices, with sightseeing context kept distinct. Never label a static image or link list as a working map.
- Use a dedicated Maps browser key restricted to the new site's exact domains and necessary APIs. Explain quota/billing and get approval before configuration. Never reuse Ron's key. Test actual tiles and place cards.
- Food choices stay near the existing route. Expand a centred fork/knife + count + chevron control. Include sources and distinguish practical convenience from personal recommendations.
- Searchable Reference library with category/area filters. Expanded entries have a photo/credit, short description, practical details, action links and collapsible sources.
- Paper-ticket booking wallet. Link each document to the user's real original in their own iCloud Drive folder. Do not invent URLs, broaden sharing or upload originals without permission. Public demo buttons open a matching themed privacy notice instead.
- Illustrated trip overview, journal and light/dark toggle. Do not claim secure/private storage unless implemented. Demo journal stays in the visitor's browser, with separate storage keys and no access to the owner's notes.
- Desktop showcase: simple white page, Arial body copy, custom heading and an interactive phone frame. On mobile let the app fill the screen. Keep resources outside the app.

CHECK BEFORE HANDOFF
Test all dates in both themes; day-to-map navigation; each meal's marker scope; venue cards; directions; zoom and expanded map; ticket actions and notice dismissal; Reference search/filter/expansion; journal save/reload/clear; and narrow-screen overflow. Verify keyboard focus and Escape for dialogs. Report observed checks separately from untested physical-phone behaviour. Don't claim perfection.
For a public demo remove accommodation identity/coordinates/routes, flight identifiers/times, seats/cabin, prices, booking references, private URLs, documents, journal entries and credentials from every delivered file and asset, not just visible text. Only ship the clean derivative with fresh history.

EXACT REFERENCE PALETTES
{
  "01": {
    "name": "Electric blue",
    "light": "--c0:#001F7A;--t0:#ffffff;--c1:#144FFF;--t1:#ffffff;--c2:#99B2FF;--t2:#000000;--c3:#4271FF;--t3:#000000;--c4:#001F7A;--t4:#ffffff;--c5:#EDF2FF;--t5:#000000",
    "dark": "--c0:#020819;--t0:#ffffff;--c1:#071C59;--t1:#ffffff;--c2:#041033;--t2:#ffffff;--c3:#071C59;--t3:#ffffff;--c4:#144FFF;--t4:#ffffff;--c5:#020819;--t5:#ffffff"
  },
  "10": {
    "name": "Yellow C3",
    "light": "--c0:#9E6F0B;--t0:#ffffff;--c1:#FFD503;--t1:#000000;--c2:#FFF8D7;--t2:#000000;--c3:#FFE039;--t3:#000000;--c4:#9E6F0B;--t4:#ffffff;--c5:#FFF8D7;--t5:#000000;--view-bg:#FFFBE9;--selected-day-bg:#FFDC35;--meal-bg:#FFF0B0",
    "dark": "--c0:#060400;--t0:#ffffff;--c1:#181103;--t1:#ffffff;--c2:#0B0801;--t2:#ffffff;--c3:#3D2A08;--t3:#ffffff;--c4:#3D2A08;--t4:#ffffff;--c5:#0B0801;--t5:#ffffff;--view-bg:#3D2A08;--selected-day-bg:#181103;--meal-bg:#110C02"
  },
  "14": {
    "name": "Cherry",
    "light": "--c0:#7A0014;--t0:#ffffff;--c1:#FF143C;--t1:#000000;--c2:#FF99AA;--t2:#000000;--c3:#FF4262;--t3:#000000;--c4:#7A0014;--t4:#ffffff;--c5:#FFEDF0;--t5:#000000",
    "dark": "--c0:#190206;--t0:#ffffff;--c1:#590715;--t1:#ffffff;--c2:#33040C;--t2:#ffffff;--c3:#590715;--t3:#ffffff;--c4:#B80E2B;--t4:#ffffff;--c5:#190206;--t5:#ffffff"
  }
}
Approved event fills: light Cherry #FFD6DE; light Blue #D6E0FF; dark Cherry #2B030A. These apply only to meal/practical rows.


Start by reading README.md and CUSTOMIZE.md. Work from this repository, not from a screenshot. Use the workflows in .agents/skills when your assistant supports project skills; otherwise follow their instructions as ordinary prompts. Never publish personal bookings or credentials.
