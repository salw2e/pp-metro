# Data and method

## Sources

- OpenStreetMap through the Overpass API (`scripts/fetch-osm.mjs`): district boundaries (admin level 6 inside Phnom Penh), railways, river and canal polygons, major-road bridges, landmarks, and major roads. Roads are kept unsimplified in `data/raw/` (not committed) because routing needs every junction node. The other layers are simplified and written to `public/data/`.
- 2019 General Population Census, Table P-12, for khan populations (in `scripts/build-network.ts`).

## Network build

`src/data/spec.ts` lists stations (target positions and planning notes) and lines (station order, construction type and routing per section). `scripts/build-network.ts` then:

1. Routes each section on the road graph (shortest path, with an optional preferred boulevard), on the railway graph, or as a direct bored alignment.
2. Simplifies the route to the street corridor, removes reversals, and merges vertices closer than 150 m.
3. Gives every station that sits on a bend a straight 300 m section, then replaces each corner with a circular curve of the design radius (300 m, 250 m on Line 4). Where a straight is too short for that radius, the smaller radius is used and reported.
4. Places stations on the final line, in order, and splits the line into sections by construction type.
5. Measures lengths, station spacing, the smallest curve radius, the curvature at each platform, and river crossings against the river polygons.
6. Adds each station's district and population, nearby landmarks and transport points (from OpenStreetMap), and flags for river proximity, heritage and platform curvature.

The result is `src/data/network.json`. `pnpm test` checks that segment lengths match the geometry, stations lie on their lines, stations are at least 600 m apart, codes are unique, names exist in both languages, no new-line curve is under 150 m, and interchange platforms are within one station complex.

## Limits

- Narrow channels that are not mapped as water areas (such as the channel west of Koh Pich) are not detected as river crossings.
- City Bus routes are not in the extract.
- Landmark categories follow OpenStreetMap tagging, which contains some errors.
