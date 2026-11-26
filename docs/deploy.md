# Deployment

The site is a static single-page application. `pnpm build` writes everything to `dist/`.

## Base path

By default the site expects to be served at `/metro/`. To serve it elsewhere, set `BASE_PATH` when building:

```
BASE_PATH=/ pnpm build
```

## nginx

Pages such as `/metro/map` are handled in the browser, so unknown paths under the base must return `index.html`:

```nginx
location ^~ /metro/ {
    alias /var/www/metro/;
    try_files $uri $uri/ /metro/index.html;

    location ~* ^/metro/assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    location ~* ^/metro/data/ {
        add_header Cache-Control "public, max-age=86400";
    }
}
```

Copy the build with `rsync -a --delete dist/ /var/www/metro/`.

## Other hosts

Any static host works (GitHub Pages, Netlify, Cloudflare Pages, S3) as long as it serves `index.html` for unknown paths under the base path. On hosts without rewrites, copy `index.html` to `404.html`.

## External services

The browser loads, at run time:

- OpenFreeMap styles, vector tiles and fonts from `tiles.openfreemap.org`
- Esri World Imagery and reference tiles from `server.arcgisonline.com` (satellite view only)
- OpenStreetMap raster tiles from `tile.openstreetmap.org` (only if the vector style fails)

No API keys are needed. For heavy public use, host your own tiles or use a commercial provider and set the variables in `.env.example`. OpenStreetMap's tile servers are not meant for heavy traffic.

## Tests on a server without a GPU

`pnpm test:e2e` runs Chrome with software WebGL (SwiftShader). It uses the system Chrome by default; set `PW_CHANNEL=chromium` and run `npx playwright install chromium` to use Playwright's own browser.
