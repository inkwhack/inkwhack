# Wanted Level

Static GTA V cheat guide and GTA VI fan journal. Open `/gta/` on the existing local server or host these files alongside the other InkWhack projects. No build or backend is required. The monthly editor changes saved files; the deployed site changes only when those files are published through the normal website workflow.

## Content

`cheats.js` contains 31 original-edition gameplay codes, three unlockable vehicle cheats, Director Mode and the phone-only Black Cellphone Easter egg. PS3 and Xbox 360 exclude the five newer entries and every phone number. PC Legacy and Enhanced share the codes. Xbox controller sequences are derived from the corresponding PlayStation physical buttons, preserving the order. There is no GTA Online, money, tank, jet or infinite-ammunition cheat. Code references and the checked date are displayed on the page.

`blog/index.html` contains dated articles with stable anchors and a matching issue index. Monthly updates should add an original article, maintain older entries, link official Rockstar sources for news and label opinion. Verify changing launch information at the time of writing. The current issue was researched on 2 October 2026.

## Artwork provenance

Generated with the built-in image generation tool. Optimised WebP assets are saved in `assets/` and labelled in the website as original AI fan artwork, not game footage. Prompts:

- `coast.webp`: Wide cinematic original fan artwork for a Grand Theft Auto fan blog, fictional subtropical coastal city at sunset, palm-lined causeway, turquoise water, distant pastel art deco skyline, one coral classic sports car driving toward city, saturated peach pink sky with violet shadows, painterly high-end videogame concept art, atmospheric and fun. Wide landscape composition, no text, no logos, no official characters, not a game screenshot.
- `neon.webp`: Wide original GTA-inspired fan artwork, fictional neon coastal city at night in rain, low angle rear view of a teal sports coupe at a crossroads, pink and cyan art deco hotel lights, palms, reflections on asphalt, cinematic illustrated concept art, vivid magenta and midnight violet, wide landscape, no text no logos no official characters, not a screenshot.
- `swamp.webp`: Wide original fan concept artwork for a GTA VI fan blog, fictional subtropical wetlands road trip, small orange speedboat passing through mangroves with an alligator lounging in foreground, sunset gold light purple clouds, birds overhead, playful cinematic illustrated videogame concept art, wide landscape, no text no logos no official characters, not a game screenshot.

## Verification

`verify.cjs` is a browser smoke test using Playwright and installed Edge. It checks all eight edition selections, original-console exclusions, phone-only exceptions, search, vehicle category, reset, JavaScript errors and mobile overflow. It expects the repository served at `http://127.0.0.1:8765/` and Playwright available in Node's module path. Screenshot outputs are review artifacts; the collection thumbnail is `../assets/project-screenshots/gta.webp`.

The guide and blog are an unofficial independent fan project and do not use official Rockstar logos, screenshots or character art.
