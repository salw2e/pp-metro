# Phnom Penh Metropolitan Rail Master Plan 2050

An independent, citizen-led preliminary proposal for a rail network in Phnom Penh, published as a website with an interactive map, station directory, cost tool, implementation scenario and a Khmer submission letter. It is not an official plan.

Live: https://justsal.xyz/metro/

## Run it

```
pnpm install
pnpm dev            # http://localhost:5173/metro/
pnpm build          # static site in dist/
```

Node 20 or newer and pnpm. The build is plain static files; see [docs/deploy.md](docs/deploy.md) for nginx, other hosts and the base path.

## Tests

```
pnpm test           # unit tests: geometry, network checks, cost model
pnpm test:e2e       # Playwright in Chrome: every page at 7 screen sizes, map gestures, search, layers, downloads, print
```

## Data

Roads, railways, rivers, bridges, districts and landmarks come from OpenStreetMap (ODbL). The alignments are routed on that geometry by `scripts/build-network.ts`, which also measures lengths, curve radii, river crossings and station positions. See [docs/data.md](docs/data.md).

```
pnpm data:osm       # download the OpenStreetMap extract
pnpm data:network   # rebuild src/data/network.json from src/data/spec.ts
```

## Map providers

Base maps use OpenFreeMap vector tiles (no key) and Esri World Imagery for satellite. Both can be replaced in `.env`; see `.env.example`. If the vector style cannot load, the map falls back to OpenStreetMap raster tiles and says so.

## Status

Every alignment, station position, cost and date is preliminary. Station coordinates are a desk study and have not been checked on site. Sources and data gaps are listed on the References page.
