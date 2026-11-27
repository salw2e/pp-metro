# Handoff notes for coding agents

Phnom Penh Metropolitan Rail Master Plan 2050: a static React site, live at https://justsal.xyz/metro/.

## Commands

- `pnpm dev` (http://localhost:5173/metro/), `pnpm build` (dist/), `pnpm test` (unit), `pnpm test:e2e` (Playwright, system Chrome with SwiftShader, about 15 minutes).
- Deploy: `pnpm build && rsync -a --chmod=D755,F644 --delete dist/ /var/www/metro/`. nginx serves /metro/ from /var/www/metro (block in /etc/nginx/sites-enabled/justsal.xyz). That server block only accepts Cloudflare, so check the public URL, not localhost.
- Commits: short lowercase subject, author salw2e, no AI or co-author lines. Push to github.com/salw2e/pp-metro (token in /root/.secrets/github-salw2e).

## Where things are

- `src/data/spec.ts`: stations and lines. `scripts/build-network.ts` turns it into `src/data/network.json` (`pnpm data:network`). Never edit network.json by hand.
- `src/map/NetworkMap.tsx`: the map page. `overlay.ts`: 2D layers. `three.ts`: 3D viaducts, station volumes, light, sky, fly-through. `labels.ts`: labels drawn to canvas (MapLibre cannot shape Khmer).
- `src/pages/*`: report pages. `src/lib/cost.ts`: cost model. `src/data/references.ts`: sources.

## Rules from the owner

- No em dashes, no emojis, no gradients, no marketing language. Plain professional English.
- Never invent figures, coordinates, dates or citations. Mark estimates as estimates.
- Look at real screenshots after a change (`node /mnt/data/pp-metro-tools/shot3d.mjs <url> <out.png>`), and run the relevant tests before deploying.
- MapLibre 6: worker is set in `src/map/maplibre.ts`; missing images use `map.setMissingStyleImageResolver`.

## Recent work (2026-11-27)

- 3D view: viaducts on piers, station volumes, grey shaded buildings, sky, base-map icons and street names hidden in 3D, text drawn above buildings, faint line trace where buildings hide a line. Fly-through button in the map tools.
- Dragging lag fixed (coordinate readout no longer re-renders React each frame). Full device resolution with antialiasing.

## Open items

- The Khmer submission letter needs review by a native speaker.
- Four stations still sit on curves (listed in the Station Directory).
- Recording quality on real phones has not been measured; tests run without a GPU.

## Cinematic camera update (2026-11-27, Codex)

- `src/map/tour.ts` composes a 32-second line presentation from real station, route and river-crossing locations, with a descending opening, side tracking, station sweep, reveal and route pullback. A selected station gets a 16-second orbit with changing zoom and pitch.
- The tour switches to the 3D city basemap before starting, so building volumes are available. Building detail and heights still depend on the map provider. This is a curated presentation, not a full traversal of every track segment.
- `startTour` in `three.ts` owns playback and cleanup. Stop, map interaction, map controls, style changes and page teardown cancel playback. Path sampling stays outside React rendering.
- Unit tests: `tests/unit/tour.test.ts`. Browser tests: `tests/e2e/tour.spec.ts`. Real-phone frame rate and recording quality remain unmeasured.
- Verification: build and 25 unit tests passed; 6 focused browser tests passed, with desktop/mobile screenshots inspected. Deployed to /var/www/metro. Lint retains existing warnings; the full unrelated browser suite was not rerun.
- Deploy uses `--chmod=D755,F644`: this environment builds files with mode 0600, which otherwise makes nginx return 403. Public HTML and the camera bundle were checked over HTTPS against the deployed build.

## Railway rendering and pace repair (2026-11-27)

- `src/map/rail-geometry.ts` computes offset edges for an entire elevated run before splitting into render pieces. Consecutive elevated segments are joined first; adjacent pieces share exact edges, preventing curve seams. Decks are opaque and have two neutral track beds rather than one coloured stripe.
- Removed the duplicate `net-xray` overlay. 3D road fills are neutral and road casings hidden, with original styling restored when leaving 3D. Metro line data is unchanged.
- Tours now run 32 seconds (line) / 16 seconds (station). Slow frames no longer discard elapsed time; hidden tabs pause the timeline. Entry takes 1.2 seconds.
- This repairs illustrative rendering, not engineering alignment, gradients, clearances or grade separation. Source building volumes may still occlude routes.
