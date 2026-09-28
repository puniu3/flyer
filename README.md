# Flyer Dungeon — Tabletop Edition

A solo dice dungeon on a physical-looking table: a printed cardboard dungeon board, three ability boards, wooden markers, an adventurer, five dice, and generated tactile foley. The rules remain those of the original Flyer Dungeon.

## Play locally

For the Japanese text CLI, run `npm ci` then `npm run play`. Enter held **face values** (`55` keeps two fives and rerolls the rest), a category (`B1`, `1s`–`6s`, `pair`, `two pair`, `full house`, `4 of`, `straight`, `free`), or skills followed by a category (`dex 3 int 5 B5`). Skill targets are face values, not die positions. `r` rerolls all dice. Input is case-insensitive; full-width digits and Japanese category names also work. Invalid compound commands change nothing.

The CLI rolls automatically at the start of each turn. It reports the next dungeon requirement, then sorted dice, remaining rerolls, available skills, and selectable categories with their ability groups. When five or fewer ability slots remain, turn starts also list those slots, regardless of skill unlocks. The list groups slots by ability and uses the input aliases `1s`–`6s` for triples, for example `残り：筋力 フルハウス、6s。敏捷 ストレート、1s、2s。` Rerolls omit that list. `remaining` shows all unused categories followed by the current hand, rerolls and available skills; `look`, `skills`, `rules`, and `help` provide other details on demand. `new` starts another run; `quit`, Ctrl-C, or EOF exits. Each action is saved locally in a versioned replay log under `$XDG_STATE_HOME/flyer-dungeon/cli` (default `~/.local/state/flyer-dungeon/cli`). `save` prints the path; exit prints it to stderr. Resume with `npm run play -- --resume /path/to/run.json`; `--seed 123` starts a reproducible run, and `--save /path/to/run.json` chooses a new log path. Existing logs are never replaced by a new run. The CLI uses the same rules engine as the browser edition.

Every submitted input, including queries, invalid commands, blank lines, `save`, `new`, and `quit`, is appended to a companion `<run.json>.calls.jsonl` transcript. Records include a timestamp, raw and normalized input, outcome, exact response text, output channel (`stdout` or `stderr`), and before/after turn, roll, and engine action counts. Start, resume, EOF, and Ctrl-C events are also recorded. Run paths link across `new`; resuming appends to the existing transcript. The transcript has its own log and UI versions, leaving engine replay logs compatible with older saves. Inputs made before this logging was added cannot be recovered.

```sh
npm ci
npm run dev
```

For the shared Mac preview, run `ports --help`, then `preview vite flyer "$PWD"`. Build output is in `dist/`; Vite supports a project base path. The printable edition remains unchanged at `print/flyerdungeon.html` and is copied into the production build at the same path.

Tap a die to hold it. Roll again to reroll only the others, up to three rolls per turn. Tap a highlighted category to place a marker. Three checked spaces on an ability board unlock its skill: tap the skill, then a die. Each skill is usable once per turn. Empty-table taps and Escape cancel skill selection. The fifth dungeon floor wins; after the third roll, defeat waits until no sequence of remaining skills can produce a valid category.

The tabletop fills the viewport. Tap the physical dice directly; held dice have a ring and no numeric labels. Keep rings disappear as the final reroll starts. Locked skills show only `0/3`, `1/3`, or `2/3` printed on the wooden chip; fixed-size physical explanation cards appear on the sheets once unlocked; their printing scales only with the tabletop camera. The circular button at bottom right shows localized roll/reroll text with the remaining count (`2/2`, `1/2`, `0/2`). Completed spaces use wooden markers without checkmark overlays. Ability use has three local effects: a copper impact for strength, a green-gold sweep for dexterity, and violet rising stars for intellect. Their dedicated sounds play when the die settles; the visual envelopes finish within 800 ms and clear on restart or hiding the page. Defeat plays a subdued descending game-over sting. Victory plays a short brass-and-bell fanfare and displays a victory message with a single play-again button; both victory and defeat dialogs require the play-again action; outside clicks and Escape do not dismiss them. Drag to pan and pinch or scroll to zoom; the camera keeps its orientation. Small mute, globe and help icons sit at top right. The globe opens a compact language list that closes on selection, outside click or Escape. Help has no close button and closes on outside click or Escape. Camera defaults are fixed at 22° field of view, 68° elevation and distance 1; navigation gestures remain temporary. Game volume is fixed; mute and language persist automatically. Japanese is the fixed default; the existing eight translation dictionaries are retained. Board headings, poker-hand names, skill cards, controls, help and result messages follow the selected language; specific die faces stay numeric.

The main target is desktop and tablet. The fixed landscape arrangement is used in every orientation; rotating the screen changes only the camera framing, never the component layout. On narrow screens, zoom into the desired board to read and select its rows. Paper grain, felt, restrained wood reflections and short contact shadows finish the physical components. Skill selection adds a steady local amber glow; the first skill unlock emits six gold flecks, and final-floor arrival emits ten with the fanfare. These effects fade smoothly, stop rendering once settled, and clear on restart or backgrounding. There is no idle animation, camera orbit, physical dice simulation, or network game. The approximately 1.2-second dice motion presents results already chosen by the rules engine; held dice stay in place. Audio begins after a user gesture, stops when muted or hidden, and does not replay old tails on resume.

## Verify

```sh
npm test
npm run type-check
npm run validate:assets
npm run build
npm run test:browser
npm run test:audio
npm run test:effects
```

Browser checks require Playwright's Chromium and WebKit (`npx playwright install chromium webkit`). They serve the production build on a loopback ephemeral port. Evidence is written to `.browser-check/`. Headless WebKit checks layout, input and audio behavior; it is not an iPad performance measurement. The `?check` interface exposes state, diagnostic values and fixture injection only for automated checks.

The rule suite covers all 7,776 dice hands against independent category predicates, floor prerequisites, selective rerolls, once-per-turn skills, skill-assisted survival, terminal states and reset. Thirty-two frozen action traces were captured from the pre-remake engine; their complete state-stream SHA-256 hashes must remain identical. Logs carry `rulesVersion: flyer-1`, a seed, actions, random draws and resulting states. The latest session stays in browser storage under `flyer:v2:last-play`; nothing is sent to a server.

`tests/fixtures/cli-dialogue-golden.json` freezes the approved dialogue, including its loss and winning fork. CLI tests replay the raw inputs and require byte-identical UTF-8 responses, unchanged actions and state hashes, matching piped stdout and transcripts, and a matching saved-fork resume. The fixture's SHA-256 is pinned independently; tests never regenerate it. `cli-dialogue-threshold-5.json` specifies the five additional lines expected after changing the remaining-ability threshold to five; `cli-dialogue-compact-abilities.json` specifies the shortened forms of those lists, including the original late-turn lists. Every other response byte remains identical to the original dialogue. Responses exclude terminal prompts and each printed response's final newline. Piped stdout is also checked in full, including those newlines.

## Rebuild artwork

```sh
npm run assets
```

Caller-owned Python generators and tooling use `uv`, Python 3.11 and `bpy==4.5.14`. Each GLB has clean-reimport front/back previews and a manifest with bounds, hashes and evaluated triangle counts. `npm run print` creates the decorative dungeon and ability-board textures from the shared layout and keeps their SVG originals in `art/`. Runtime canvas printing adds localized text at fixed sizes. Japanese, Simplified Chinese, Traditional Chinese and Korean use bundled Noto Serif JP/SC/TC/KR subsets, loaded before printing; Simplified Chinese explicitly uses SC rather than Japanese glyphs. `npm run fonts:prepare` fetches subsets for the current translation source from Google Fonts; font licenses ship in `public/assets/fonts/`. Regenerate the subsets when adding translated characters. `npm run test:localization` checks eight locales, text bounds, unchanged game state and the actual Simplified Chinese browser font. Runtime components, textures and build tools live in this repository.

The scene uses Three.js, a perspective camera initially at 22° vertical FOV and 45° elevation, soft shadow filtering, and a pixel-ratio cap of 2. Rendering occurs only for state/camera changes and active movements. GLBs use standard glTF materials, exposed wooden edges and restrained bevels. Card thickness and contact shadows remain real geometry. Exported triangle counts are 800 for a die, 296 for the adventurer, 88 for a marker and 176 for a skill token; all four GLBs validate without errors or warnings.

## Foley

```sh
npm run audio:generate
npm run audio:prepare
```

`audio:generate` calls the installed `stable` launcher sequentially for the dice roll, cardboard flip and victory fanfare (5 seconds, 8 steps, CFG 1.0, fixed seeds). New runs stay under `.audio-generation/` and do not overwrite selected masters. Three selected wood-contact/gather masters are inherited from the Porto Vecchio template. Original WAVs, prompts, provenance and generator settings are preserved under `art/audio/sources/`.

Preparation reads the exact selected masters, trims their chosen intervals, filters rumble, narrows stereo width, optionally layers a slowed low-frequency body, normalizes and fades delivery copies. `public/assets/audio/manifest.json` records processing parameters, file hashes, duration, peak and clipping counts. The runtime limiter sits after master volume. Wood impacts occur on visual contact; cancellation invalidates pending playback.

Run `npm run audio:generate -- victory` to generate only a new fanfare candidate.

Open `audio-demo.html` to audition all ten cues at an independent saved volume. Audio checks measure post-limiter output, mute and stale-playback behavior. They do not certify perceived timbre; audition the delivery files for that judgment.

## Rule authority

`flyerdungeon.yaml` retains the rule definitions. `src/rules.ts` owns `init`, `step` and `getView`; `step` accepts an optional random-number source while preserving its previous two-argument call. The scene and DOM are consumers of that engine. No rendering or sound event changes game state. The print version and pre-existing untracked experiments are outside the remake.

## Publication

GitHub Actions builds and deploys `dist/` to https://puniu3.github.io/flyer/. The existing printed QR continues to open the current edition. `/classic/` preserves the deployed original from commit `0d661a85ff69fc2733d4eb8357cbfe5a5826a09d`, with a link back to the current edition. `/print/flyerdungeon.html` retains its existing URL. The Help dialog links to the classic edition. Model preview images, model manifests, audio audition pages and WAV assets are excluded from the deployed artifact. Runtime effects use stereo MP3 (LAME VBR quality 2), bundled with content-hashed URLs. `npm run audio:encode` rebuilds delivery files from the selected WAVs; `art/audio/encoded.json` records source and delivery hashes. WAV masters remain available for editing.
