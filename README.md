# Omramo — website (omramo.com)

The marketing site for **Omramo**, an illustrated story app for readers aged 6 to 14 and up, and anyone who loves stories, built for iPhone, iPad and iPhone Duo. Pre-launch: the site says "Coming soon" and collects nothing.

Plain HTML, one CSS file and one small vanilla JS file. **No build step, no framework, no CDN, no
external requests of any kind.** Everything is self-hosted.

## Preview locally

```sh
python3 -m http.server 8765
# open http://localhost:8765/
```

Paths are **root-relative** (`/assets/...`), because the final host is the custom domain
`omramo.com` served from the site root. That means the site must be previewed from a server rooted
at this folder (as above); it will not work from `file://` or under a GitHub Pages project
sub-path such as `user.github.io/web/`. Do not add a `CNAME` file here; the coordinator handles DNS.

Add `?static=1` to any URL for a fully static render (no scroll-driven motion, tabbed sections
unfolded into stacked ones). Users with `prefers-reduced-motion` get the static presentation
automatically, with the tabs still working.

## Structure

```
index.html              Home (one page, anchored sections)
privacy/index.html      DRAFT privacy summary (placeholder, not legal text)
terms/index.html        DRAFT terms summary (placeholder, not legal text)
404.html                Not-found page (GitHub Pages picks this up)
favicon.ico, apple-touch-icon.png, site.webmanifest
assets/
  css/site.css          All styles. Tokens follow the app's docs/DESIGN.md
  js/site.js            Progressive enhancement only (scroll scenes, tap-to-see demo, tabs, map, menu)
  fonts/                Bricolage Grotesque, Atkinson Hyperlegible Next, Inter (WOFF2 subsets) + OFL licences
  img/shots/            Real app screenshots (iOS Simulator, rounds 4 and 5): AVIF + WebP at several widths, one PNG fallback
  img/                  og.png, icons (from the app's icon), grain, small SVGs
_tools/                 Build helpers. Not part of the site (see below)
```

The home page reads top to bottom: hero → why it exists → three levels → ten regions (with every
story of the catalog) and the library → landmarks → tap-to-see, more cards, character cards, the
folded / iPhone page and the story-finished moment → grown-ups and privacy → the planned family
plan → coming soon.

The headline is "Read your way around the world." The app's tagline, "Turn the page. See the
world." (`Brand.tagline`, round 5), sits under it, in the footer lockup and in the meta / OG text.
The site's own copy does not call the product a book; keep it that way. The closing section shows
the real round-5 splash, which carries the tagline.

The site follows the app: whatever merges into the app is reflected here wherever it applies.
Facts on the page (32 stories, 11 / 11 / 10 per level, 37 landmarks, the story list per region,
the Great Pyramid fact cards) come from the app's `catalog.json`, `story.json` files and
`landmarks.json`. Features not built in the app yet (parent view, grown-up gate, sample gate,
subscription) are labelled as planned and have no screenshots.

### How the page is built

- **Device frames** are CSS, sized with container-query units so one component works at any width.
  `.duo.duo--real` is the unfolded iPhone Duo (two 1416 × 1320 panes cut from the Simulator's
  unfolded capture, and a drawn hinge); `.duo--phone` is an iPhone or the folded Duo
  (1320 × 2868); `.pad` is an iPad in landscape (2752 × 2064).
- **Screens** are real Simulator captures in `<picture>` elements: AVIF and WebP `srcset` with a PNG fallback, explicit
  `width`/`height`, lazy-loaded below the fold; the hero panes are eager with `fetchpriority="high"`.
  There are no image preloads: the hero images are in the markup, and a preload that does not match
  the chosen candidate exactly logs a console warning.
- **Scroll scenes** all need `html.motion`, and each has a plain layout underneath:
  - *Hero*, ≥ 1180px wide and ≥ 700px tall: `.hero__track` is 230vh and `.hero__stage` is sticky.
    The device rises and opens flat, then the numbered notes (`.callout`) and their beacons on the
    screenshot (`.beacon`) arrive. Beacon positions are percentages of the screenshot; if the hero
    screens change, move them in the CSS.
  - *Levels*, ≥ 960px: the three `.tier__fig` devices share one sticky grid cell and cross-fade as
    each `.tier__copy` passes the middle of the screen. Below 760px `.tiers` is a swipeable row.
  - *Landmarks*, ≥ 960px wide and ≥ 740px tall: `.journey` is pinned and vertical scrolling moves
    the `.rail` sideways. Otherwise the rail scrolls natively, with previous/next buttons.
- **Tap-to-see demo** (`[data-demo]`): two round-4 iPad captures of the same Monkey page, closed
  and with the "River bank" card open, are stacked in one `.pad` (they line up pixel for pixel).
  `.hot--word` and `.hot--back` are real buttons placed over "river bank" and over the app's
  "Back to my line" button. Without JavaScript, or with `?static=1`, the open state is shown.
- **Small-screen menu** is a `<details>` in the header, so it opens without JavaScript.
- **Without JavaScript** everything is visible and readable: tabbed sections are stacked, reveals
  are off.
- **Motion** runs only when `html.motion` is set, which the inline boot script does only if the user
  has not asked for reduced motion. Scroll-driven code writes transforms, opacity and custom
  properties only, and never on `<html>`, which would restyle the whole page on every frame.

## Rules

1. **Do not add trackers.** No analytics, cookies, pixels, tag managers, embeds, third-party fonts
   or scripts, and no data-collecting forms. The product promise is "collect nothing"; the website
   must keep it. If you ever need a number, get it from the host's own aggregate reports.
2. **Do not invent facts.** No prices, launch dates, reviews, ratings, testimonials, user counts or
   statistics. Claims on the site come from the app's `docs/PRD.md`, `docs/DESIGN.md` and
   `docs/CONTENT_PLAN.md`. If those change, change the site.
3. **Never the hardcover-book look.** No paper texture, cream pages, serif type, spines or page curls.
4. **Keep the CSP strict.** Each page carries a Content-Security-Policy `<meta>` that allows only
   same-origin resources. Inline styles (`style="..."`) and inline `<style>` are blocked, so style
   with classes. The single inline boot script in `<head>` is allowed by its SHA-256 hash; if you
   edit it, recompute the hash and update it on every page:

   ```sh
   # paste the exact text between <script> and </script>
   printf '%s' '<script text>' | openssl dgst -sha256 -binary | openssl base64
   ```

## Placeholders to resolve before launch

| What | Where | Note |
|---|---|---|
| `<meta name="robots" content="noindex">` | every page `<head>` | Pre-launch preview. **Remove at launch.** |
| `mailto:hello@omramo.com` | home closing section, footer, privacy, terms | Marked `<!-- PLACEHOLDER: mailbox not confirmed -->` |
| "Price to be announced" | home, family section (labelled planned); terms | No price exists. Never guess one |
| Privacy page | `privacy/index.html` | DRAFT banner; summary of intended principles only. Needs legal review. Hosting-log sentence to confirm |
| Terms page | `terms/index.html` | DRAFT banner; needs real Terms of Use |
| App Store badge / link | not present | Add only when the app is published |
| "Ages 6 to 14 and up, and anyone who loves stories" | home: facts line under the hero, lede, meta description | Locked 13 Nov 2026, 8:46 PM ET. Not in the App Store Kids Category. Do not narrow the age range. |
| "in development for iPhone Duo, iPhone and iPad" | home closing section; also the hero pill and lede | Locked with the same 13 Nov 2026 decision: universal app. |
| Story list per region | home, world section | From the app's `catalog.json` (round 5, 32 drafts; texts, art, facts and cultural review pending). Update when the catalog changes |
| Landmark facts and the Great Pyramid fact cards | home, landmarks section | The app's draft `landmarks.json` wording; `review.facts` pending |
| Screens | `assets/img/shots/` | Real Simulator captures of the app in development (rounds 4 and 5); pictures are concept art drawn in code |
| Family plan, free sample, parent view | home, family and grown-ups sections | Not built in the app; shown as planned, with no screens |
| Canonical / Open Graph URLs | every page `<head>` | Assume `https://omramo.com` |

## Regenerating assets (`_tools/`)

The underscore keeps the folder out of a default GitHub Pages (Jekyll) build. **Do not add a
`.nojekyll` file** unless you also stop publishing `_tools/`.

```sh
# fonts: subset + WOFF2 (needs fontTools; uses Node's Brotli through a small shim if the brotli wheel is missing)
python3 _tools/build_fonts.py  <app-repo>/docs/design/source/fonts
# screenshots: AVIF/WebP/PNG derivatives of the real captures listed in the script (needs Pillow with AVIF)
#   every r5 iPad capture is saved rotated by XCUITest; the script turns it upright
python3 _tools/build_images.py <screens-r5-dir> <sim-shots-dir>
# icons from the app's icon, then (with the local server running) the OG image (needs google-chrome)
python3 _tools/build_brand.py <app-repo>/docs/brand/app-icon-1024.png
# full-page check screenshots
python3 _tools/shots.py ../web-shots
# captures at any size and scroll position, with console / CSP / overflow checks
# (needs google-chrome and Node 22+; expects `python3 _tools/serve.py` on port 8766, or set BASE=)
node _tools/cdp.mjs ../web-shots '[{"name":"home","url":"/?static=1","w":1440,"full":true,"reduce":true}]'
node _tools/cdp.mjs /tmp/shots '[{"name":"hero","url":"/","w":1440,"h":900,"scrolls":[0,600,1170,"#levels"]}]'
```

## Credits

Fonts: Bricolage Grotesque, Atkinson Hyperlegible Next and Inter, each under the SIL Open Font
License 1.1 (licence texts in `assets/fonts/`). The dotted world map is the stylised, hand-plotted
map from the app's design source, not survey data. Landmark glyphs are original drawings.
