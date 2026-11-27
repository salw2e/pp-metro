# Handoff notes for coding agents

Phnom Penh Metropolitan Rail Master Plan 2050: a static React site, live at https://justsal.xyz/metro/.

## Commands

- `pnpm dev` (http://localhost:5173/metro/), `pnpm build` (dist/), `pnpm test` (unit), `pnpm test:e2e` (Playwright, system Chrome with SwiftShader, about 15 minutes).
- Deploy: `pnpm build && rsync -a --delete dist/ /var/www/metro/`. nginx serves /metro/ from /var/www/metro (block in /etc/nginx/sites-enabled/justsal.xyz). That server block only accepts Cloudflare, so check the public URL, not localhost.
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
