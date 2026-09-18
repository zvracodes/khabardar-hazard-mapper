Khabardar — Street Hazard Mapper for Lahore

"Khabardar" (خبردار) means "beware" or "be alert" in Urdu.

A community-powered hazard mapping tool that lets citizens mark dangerous street conditions — open manholes, exposed wiring, unmarked construction pits, waterlogged roads, and weak footbridges — the moment they spot them, at their exact real-world location, so the most life-threatening hazards get fixed first.

Built for Smart City Hackathon Lahore 2026 — City Intelligence / Public Preparedness tracks.

🚩 The Problem

Every year, Lahore sees preventable injuries and deaths caused by everyday street hazards that go unreported or unnoticed for weeks:

Open manholes and missing drain covers, especially dangerous after dark or during monsoon flooding
Exposed or low-hanging electrical wiring near footpaths and roads
Unmarked construction pits left without barriers or warning signs
Waterlogged streets that flood repeatedly with no visible drainage fix
Weak or damaged footbridges and plank crossings over nullahs

Right now, if a resident notices one of these, their options are limited: call a government helpline that may not log the location precisely, post on social media where it gets lost in the feed, or simply hope someone else reports it. There is no shared, visual, GPS-accurate record of where a city's most dangerous spots actually are — so authorities have no data-driven way to decide what to fix first.

Why it matters
These are not "inconvenience" issues like a pothole — they are life-safety hazards that cause serious injury and, in the case of open manholes and live wires, death.
Monsoon season sharply increases risk: waterlogged streets hide open manholes and pits underwater, making them nearly invisible until someone falls in.
Vulnerable groups — children walking to school, elderly residents, pedestrians at night — are disproportionately affected because they are least able to spot or avoid these hazards in time.
Civic bodies (WASA, LDA, TMA, local Union Councils) often lack a simple, low-cost way to see hazard density across their jurisdiction in real time.
💡 The Solution

Khabardar is a lightweight, real-map-based reporting tool where anyone can:

Click directly on a live map of Lahore (OpenStreetMap) to drop a pin at the exact GPS location of a hazard — or tap "Use my current location" to mark it from wherever they're standing.
Classify the hazard (manhole, exposed wire, pit, waterlogged street, weak footbridge, other) and its severity (Critical / High / Medium).
Add a description and an optional photo for context.
Instantly see the hazard appear on the shared map for everyone else to see.

The app then does the work a busy ward officer doesn't have time to do manually:

Auto-ranks hazards by severity and how long they've been open, producing a clear "fix this first" list.
Triggers a monsoon watch alert automatically when multiple waterlogged spots are reported in the same week — surfacing flood risk before the next heavy rain.
Syncs live across every device (via Firebase), so a hazard reported on one phone appears instantly on everyone else's screen — including a civic officer's dashboard — when Firebase is configured; it falls back to a fully working single-device demo mode otherwise.

This turns scattered, informal complaints into a structured, prioritized, shareable, GPS-accurate picture of citywide risk.

👥 Who Benefits
Group	Benefit
Residents & pedestrians	See hazards before walking into them; know which routes are currently risky
Parents & schools	Identify dangerous stretches near school routes
Local councillors / Union Councils	Get a real-time, evidence-based priority list instead of relying on scattered phone complaints
WASA / LDA / TMA field teams	Know exactly where to send repair crews first, based on severity and precise GPS coordinates — not guesswork
NGOs & community groups	Use the data to advocate for infrastructure fixes in underserved neighborhoods
📈 Impact & Scalability
Zero cost to run — the app is a static site (no server needed) that can be hosted for free on GitHub Pages, Netlify, or Vercel.
Zero cost to scale data-wise — Firebase's free tier comfortably supports a city-wide pilot before any paid tier is needed.
Works with any city — the AREAS array in script.js holds names and coordinates; pointing the same codebase at another city (Karachi, Faisalabad, Multan) is a config change, not a rebuild.
Real GPS coordinates from day one — because hazards are pinned on an actual map rather than a stylized diagram, the data is immediately usable by any GIS tool or civic dashboard without a conversion step.
Designed to plug into existing civic workflows: the severity-ranked table is intentionally simple enough to be screen-shared in a WASA/TMA morning briefing without any training.
Natural extension path: WhatsApp-based reporting (for citizens without smartphones or app literacy), SMS alerts to nearby residents when a Critical hazard is marked, and integration with official complaint-management systems (like a public LDA/WASA API, if one becomes available).
🛠️ Technology & Innovation

Khabardar is intentionally built to be simple, transparent, and fast to deploy — no backend server, no build tooling, and no infrastructure required to run a working demo, while still being production-minded where it matters most.

HTML, CSS, and vanilla JavaScript — no frameworks, so it loads instantly on low-end phones and slow connections, which matters for a civic tool meant for wide public use.
Real map integration (Leaflet.js + OpenStreetMap) — hazards are placed with actual latitude/longitude coordinates by clicking the live map or using the device's GPS via navigator.geolocation. This means every report is immediately usable by real-world mapping, GIS, or civic dashboard tools — no manual coordinate conversion needed.
Severity-weighted prioritization algorithm — hazards are automatically ranked using a simple, explainable formula (severity weight, then time open), rather than a black-box model. This keeps the logic auditable and trustworthy for a civic decision-making tool.
Firebase Realtime Database + Firebase Storage — hazard records sync live across every connected device through Realtime Database, while uploaded photos are stored in Firebase Storage (not embedded as Base64 in the database), keeping each database record small and avoiding payload-size limits as the number of reports grows. The app detects on load whether Firebase credentials are configured: if yes, it runs in full live, multi-device, photo-hosted mode; if not, it gracefully falls back to local browser storage with in-browser photo previews, so the demo always works even with zero setup.
Input sanitization against XSS — user-entered descriptions are stripped of any HTML tags and length-capped at the point of submission, then escaped again at render time (defense in depth), before ever being displayed to other users.
Automated monsoon-risk detection — a lightweight rule (2+ waterlogged reports in 7 days) surfaces a proactive climate-preparedness alert, directly tying the "City Intelligence" data tool to the "Public Preparedness Ahead of the Climate Crisis" track.

This approach was chosen deliberately over a heavier tech stack (e.g., a custom backend or a paid mapping API) because for a civic reporting tool, reliability, low cost, and fast rollout matter more than technical complexity — a tool that field teams and residents can actually use on day one, on real GPS coordinates, is worth more than a more "advanced" prototype that requires infrastructure the city doesn't have.

🖥️ How It Works (User Flow)
Open the app — the live map of Lahore loads with existing hazard pins already visible at their real locations.
Click anywhere on the map where a hazard exists, or tap "Use my current location."
A pin marker appears at that exact GPS coordinate; the report form on the right becomes active.
Select the nearest area, hazard type, and severity; optionally add a description and photo.
Submit — the pin is added permanently (photo uploaded to Firebase Storage if configured), the "Most Dangerous Right Now" table re-ranks instantly, and the update appears on every other connected device in real time.
📁 Repository Structure
├── index.html      # Page structure and markup
├── style.css       # All styling (design tokens, layout, map, components)
├── script.js       # App logic: Leaflet map, Firebase sync + storage, ranking, sanitization
└── README.md       # This file

To run locally: simply open index.html in a browser — no installation or build step needed. Keep all three files in the same folder.

To enable live multi-device sync and hosted photos: create a free Firebase project, enable Realtime Database and Storage, and paste your config keys into the FIREBASE_CONFIG object at the top of script.js. Without this step, the app runs in local single-device demo mode automatically — no errors, no broken features. Firebase Storage specifically is optional: if only Realtime Database is enabled, hazard reports still sync live across devices, and photos simply fall back to the in-browser preview instead of a hosted URL.

🎥 Demo Video

https://www.youtube.com/watch?v=qdHkrdK13A8

The video should cover: the problem, a live walkthrough of marking a hazard on the real map, the severity ranking table, and the monsoon alert feature.

📊 Presentation Deck

https://canva.link/a66kfn3m3o9w8z2

🔗 Live Demo

https://zvracodes.github.io/khabardar-hazard-mapper/

Repository link:

https://github.com/zvracodes/khabardar-hazard-mapper

✅ Alignment with Judging Criteria
Criterion	How Khabardar addresses it
Problem relevance	Targets a specific, recurring, and under-addressed local hazard (open manholes, exposed wiring, monsoon flooding risk) rather than a generic civic complaint app
Civic impact	Directly supports life-safety outcomes and gives civic bodies a prioritized, GPS-accurate, actionable fix-it list
Innovation	Severity-weighted auto-ranking, automatic monsoon-risk detection, real GPS-based reporting via Leaflet/OpenStreetMap, and a dual-mode (offline/live-sync) architecture that removes the usual barrier to running a real pilot
Technical execution	Fully functional front end with live map integration, cloud photo storage, input sanitization, and graceful fallback if backend services aren't configured
User experience	One-click map reporting or one-tap "use my location," with no sign-up or app install; a 20-second reporting flow designed for real-world adoption
Scalability	Free-tier infrastructure, city-agnostic configuration, GPS-native data from day one, and a clear extension roadmap (WhatsApp reporting, SMS alerts, API integration)
Clarity of communication	This README, the in-app legend, and the severity badges are written to be understood by both technical judges and non-technical civic stakeholders
🚀 Future Roadmap
WhatsApp-based reporting for residents without smartphone/app access
SMS alerts to nearby residents when a Critical hazard is marked nearby
Photo-based auto-classification of hazard type (optional AI enhancement)
Integration with official WASA/LDA/TMA complaint systems, where public APIs exist
Admin view for civic staff to mark hazards as "resolved," building a public accountability record over time
🙏 Built For

Smart City Hackathon Lahore 2026 — Code for Pakistan, hosted at Lahore Garrison University.

Team: Zahra Nawaz 
