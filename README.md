# omramo-web

Public marketing and brand site for [omramo.com](https://omramo.com). Omramo is an illustrated Telugu serial reader for iPhone Duo; the private iOS app lives in `srikanthbellary/omramo`. This repo is the design site only: GitHub Pages, static HTML, CSS and SVG. No build step, no framework, no analytics.

## Open it locally

Double-click `index.html`. That is the whole build.

Everything is relative-pathed, so the pages work from `file://`, from the project URL on github.io, and from the root of omramo.com. If you prefer a server (for the fonts on some browsers), any static one works:

```sh
python3 -m http.server 8000
# then http://localhost:8000
```

## What is here

| File | What it is |
| --- | --- |
| `index.html` | Landing. The fold mark opens on load; press it to close the book again. |
| `brand.html` | Brand book: construction grid, the four letters, lockups, tokens, type, surfaces, rules, files. |
| `app-screens.html` | Five reader moments on an iPhone Duo frame: closed, splash, library, spread, paywall. |
| `404.html` | Not in this edition. Self-contained so it styles itself at any path. |
| `assets/site.css`, `assets/site.js` | One paper and ink system, day and night from the same tokens. Fold, theme and reveal behaviour, no dependencies. |
| `assets/fonts/` | Newsreader (variable, Latin), self-hosted under the OFL. UI text uses the system sans. |
| `brand/*.svg` | The mark as real geometry: light, dark, mono, the closed word, and the construction sheet. Paths only, no `<text>` in the mark. |
| `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` | The fold glyph and the home screen icon. |
| `og.png`, `og-brand.png`, `og-screens.png` | 1200 by 630 share cards, one per page. |
| `robots.txt`, `sitemap.xml`, `.nojekyll` | Site hygiene. |
| `.github/workflows/deploy.yml` | Pages deploy from `main`, root folder, `build_type: workflow`. |

## The mark

Two pages seen from above and a spine between them. OM on the left page, MO on the right, RA on the spine. Closed, the six letters sit on one baseline and read Omramo. Open, it is the book. Each letter is drawn on a grid from stems, wedge serifs and ellipse arcs, so the SVG files are geometry you can read in a text editor.

## Rules the site keeps

- Latin script only. Telugu is the body text of a story in the reader, never a design surface here.
- Saffron `#E07A1F` is the only action color. It is never a fill for the mark.
- Night mode is the same tokens with different values, not a second brand.
- No cookies, no analytics, no third-party requests.

## Deploying

The workflow uploads the repo root as the Pages artifact on every push to `main`. In the repo settings, Pages must be set to build from GitHub Actions once (Settings, Pages, Source: GitHub Actions). No `CNAME` is committed yet; add one containing `omramo.com` when the DNS is ready to move.
