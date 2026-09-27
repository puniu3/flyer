# Flyer Dungeon — Tabletop Edition

A solo dice dungeon on a physical-looking table: a printed cardboard dungeon board, three ability boards, wooden markers, an adventurer, five dice, and generated tactile foley. The rules remain those of the original Flyer Dungeon.

## Play locally

```sh
npm ci
npm run dev
```

For the shared Mac preview, run `ports --help`, then `preview vite flyer "$PWD"`. Build output is in `dist/`; Vite supports a project base path. The printable edition remains unchanged at `print/flyerdungeon.html` and is copied into the production build at the same path.

Tap a die to hold it. Roll again to reroll only the others, up to three rolls per turn. Tap a highlighted category to place a marker. Three checked spaces on an ability board unlock its skill: tap the skill, then a die. Each skill is usable once per turn. Empty-table taps and Escape cancel skill selection. The fifth dungeon floor wins; after the third roll, defeat waits until no sequence of remaining skills can produce a valid category.

The tabletop fills the viewport. Tap the physical dice directly; held dice have a ring and no numeric labels. Keep rings disappear as the final reroll starts. Locked skills show only `0/3`, `1/3`, or `2/3` printed on the wooden chip; fixed-size physical explanation cards appear on the sheets once unlocked; their printing scales only with the tabletop camera. The circular button at bottom right starts as `Roll`, then shows `Reroll 2/2`, `Reroll 1/2`, and `Reroll 0/2`. Completed spaces use wooden markers without checkmark overlays. Victory plays a short brass-and-bell fanfare and displays a victory message with a single play-again button; both victory and defeat dialogs require the play-again action; outside clicks and Escape do not dismiss them. Drag to pan and pinch or scroll to zoom; the camera keeps its orientation. Small sound and help icons sit at top right. Settings, reached through help, expose field of view, elevation, framing distance, volume, language, restart, and play-log export. Camera changes persist only after Save; navigation gestures remain temporary. Sound preferences and language persist automatically. Japanese is the fixed default; the existing eight translation dictionaries are retained. Board printing uses English poker-hand names and numeric patterns for specific die faces.

The main target is desktop and tablet. The fixed landscape arrangement is used in every orientation; rotating the screen changes only the camera framing, never the component layout. On narrow screens, zoom into the desired board to read and select its rows. There is no idle animation, camera orbit, physical dice simulation, or network game. The approximately 1.2-second dice motion presents results already chosen by the rules engine; held dice stay in place. Audio begins after a user gesture, stops when muted or hidden, and does not replay old tails on resume.

## Verify

```sh
npm test
npm run type-check
npm run validate:assets
npm run build
npm run test:browser
npm run test:audio
```

Browser checks require Playwright's Chromium and WebKit (`npx playwright install chromium webkit`). They serve the production build on a loopback ephemeral port. Evidence is written to `.browser-check/`. Headless WebKit checks layout, input and audio behavior; it is not an iPad performance measurement. The `?check` interface exposes state, diagnostic values and fixture injection only for automated checks.

The rule suite covers all 7,776 dice hands against independent category predicates, floor prerequisites, selective rerolls, once-per-turn skills, skill-assisted survival, terminal states and reset. Thirty-two frozen action traces were captured from the pre-remake engine; their complete state-stream SHA-256 hashes must remain identical. Logs carry `rulesVersion: flyer-1`, a seed, actions, random draws and resulting states. The latest session stays in browser storage under `flyer:v2:last-play`; nothing is sent to a server.

## Rebuild artwork

```sh
npm run assets
```

Caller-owned Python generators and tooling use `uv`, Python 3.11 and `bpy==4.5.14`. Each GLB has clean-reimport front/back previews and a manifest with bounds, hashes and evaluated triangle counts. `npm run print` creates the dungeon and ability-board textures from the shared layout and keeps their SVG originals in `art/`. Printing uses the font configuration in `tools/fonts.conf`; the delivered PNGs need no browser fonts. Runtime components, textures and build tools live in this repository.

The scene uses Three.js, a perspective camera initially at 22° vertical FOV and 45° elevation, soft shadow filtering, and a pixel-ratio cap of 2. Rendering occurs only for state/camera changes and active movements. GLBs use standard glTF materials, exposed wooden edges and restrained bevels. Card thickness and contact shadows remain real geometry. Exported triangle counts are 800 for a die, 296 for the adventurer, 88 for a marker and 176 for a skill token; all four GLBs validate without errors or warnings.

## Foley

```sh
npm run audio:generate
npm run audio:prepare
```

`audio:generate` calls the installed `stable` launcher sequentially for the dice roll, cardboard flip and victory fanfare (5 seconds, 8 steps, CFG 1.0, fixed seeds). New runs stay under `.audio-generation/` and do not overwrite selected masters. Three selected wood-contact/gather masters are inherited from the Porto Vecchio template. Original WAVs, prompts, provenance and generator settings are preserved under `art/audio/sources/`.

Preparation reads the exact selected masters, trims their chosen intervals, filters rumble, narrows stereo width, optionally layers a slowed low-frequency body, normalizes and fades delivery copies. `public/assets/audio/manifest.json` records processing parameters, file hashes, duration, peak and clipping counts. The runtime limiter sits after master volume. Wood impacts occur on visual contact; cancellation invalidates pending playback.

Run `npm run audio:generate -- victory` to generate only a new fanfare candidate.

Open `audio-demo.html` to audition all six cues at an independent saved volume. Audio checks measure post-limiter output, mute and stale-playback behavior. They do not certify perceived timbre; audition the delivery files for that judgment.

## Rule authority

`flyerdungeon.yaml` retains the rule definitions. `src/rules.ts` owns `init`, `step` and `getView`; `step` accepts an optional random-number source while preserving its previous two-argument call. The scene and DOM are consumers of that engine. No rendering or sound event changes game state. The print version and pre-existing untracked experiments are outside the remake.
