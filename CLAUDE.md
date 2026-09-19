# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Talentcore — marketing site for an Azerbaijani recruitment / executive-search agency. Static HTML/CSS/vanilla JS with **no build step, no package manager, no tests, no dependencies**. Only external resource is the Poppins webfont from Google Fonts.

To preview, open the `.html` files directly or serve the folder (`python -m http.server`). A server is preferable — `localStorage` and relative paths behave more predictably than under `file://`.

Primary content language is Azerbaijani (`<html lang="az">`), including code comments. Keep comments in Azerbaijani to match.

## Architecture

Each page is a standalone HTML file that loads `css/global.css` + its own page stylesheet, and `js/main.js` at the end of `<body>`. There is no templating — **the entire `<header class="glass-header">` block is duplicated verbatim in every page**. Changes to nav, logo, theme toggle, language dropdown, or the CV button must be applied to every `.html` file (currently `index.html`, `about.html`, `services.html`, `vacancies.html`, `industries.html`, `contact.html`, `cv.html`, `404.html`). All six nav links (`index`, `about`, `services`, `vacancies`, `industries`, `contact`) and the header's `cv.html` "CV Göndər" button now resolve to real pages — nothing left dangling.

- `css/global.css` — theme CSS variables, header/nav, hamburger, theme switch, `.btn-primary`, `.send-cv-btn`, the shared `.glass-effect` card component, the shared form components (`.form-row`, `.form-group` + its `input`/`select`/`textarea`/`input[type=file]` styling, `.form-note` + `.status-success`/`.status-error`, `.botcheck-field`) used by both `contact.html` and `cv.html`, and the shared responsive breakpoints (1024px, 768px).
- `css/home.css`, `css/about.css`, `css/services.css`, `css/vacancies.css`, `css/industries.css`, `css/contact.css`, `css/cv.css`, `css/notfound.css` — page-specific sections only (layout/hero/grid rules; the actual form-field styling lives in `global.css`, see above).
- `js/main.js` — one `DOMContentLoaded` handler with three independent, null-guarded blocks: language switch, theme + logo, hamburger menu. All shared behavior lives here.
- `js/vacancies.js` — page-specific script for `vacancies.html` only (self-guards via `if (!listEl || ...) return;` if its elements aren't present). Owns the hardcoded `VACANCIES`/`CATEGORIES` sample data and the 3-column sahələr→siyahı→detal interaction (category filter, click-to-view-detail). Category counts are derived from `VACANCIES` at render time, not hand-maintained. Reads an optional `?category=<id>` URL param on load (e.g. from an `industries.html` card link) to open the page pre-filtered to that sahə. **A Supabase migration for this data is in progress but paused** — see `supabase/schema.sql` and the assistant's saved memory on it; `VACANCIES` is still hardcoded until that's finished.
- `js/contact.js` / `js/cv.js` — page-specific scripts (same self-guard pattern), both submit via `fetch` to [Web3Forms](https://web3forms.com) (`https://api.web3forms.com/submit`) rather than a backend, forwarding straight to `info@talentcore.az` with no mail client opening. **Both require the same one-time setup step**: their forms' hidden `access_key` input still holds the placeholder `YOUR_WEB3FORMS_ACCESS_KEY` — go to web3forms.com, enter `info@talentcore.az`, and paste the real access key emailed back into *both* `contact.html` and `cv.html` (each JS file refuses to submit and shows an error while its placeholder is still in place). Hidden `subject` inputs set each email's subject line; visible dropdowns are named `inquiry_type` (contact) / `field_of_interest` (cv) rather than `subject`, to avoid clashing with Web3Forms' reserved field name. `botcheck` is an invisible honeypot field for spam bots on both forms. `cv.html`'s file input is named `attachment` (Web3Forms' convention for file uploads) and both HTML and `js/cv.js` cap it at 5MB client-side — Web3Forms' own limit should be double-checked if that changes.
- `industries.html` / `css/industries.css` — "İxtisaslaşdığımız sahələr": a grid of `.glass-effect` cards, one per sector, each linking to `vacancies.html?category=<id>` using the same 7 category ids as `js/vacancies.js`'s `CATEGORIES` (`it`, `finance`, `marketing`, `construction`, `logistics`, `banking`, `hr`) — keep all three lists (here, `js/vacancies.js`, and `cv.html`'s "Maraqlandığınız Sahə" dropdown) in sync if a sector is added or renamed.
- `robots.txt` / `sitemap.xml` — reference the production domain `https://talentcore.az`. `sitemap.xml` only lists pages that actually exist (`/`, `/about.html`, `/services.html`, `/vacancies.html`, `/industries.html`, `/contact.html`, `/cv.html`); add an entry whenever a new page goes live, same for `og:url`/`canonical` tags in that page's `<head>`.
- `404.html` — static not-found page (works automatically on GitHub Pages/Netlify/Cloudflare Pages by filename convention; other hosts need an explicit `error_page`/`ErrorDocument` directive). Carries `<meta name="robots" content="noindex, follow">` since it shouldn't be indexed.
- `supabase/schema.sql` — reference SQL (not auto-run by anything) for an in-progress migration of `js/vacancies.js`'s hardcoded vacancy data to a Supabase-hosted table, so vacancies can eventually be edited from Supabase's Table Editor instead of code. See the assistant's saved project memory for status.

When testing responsiveness at narrow widths with a headless browser on this machine, `--window-size` has been observed not matching the actual CSS viewport (Windows display-scaling interference) — verify with a `window.innerWidth`/`scrollWidth` probe before trusting what a screenshot appears to show cut off, rather than assuming a layout bug.

### Theming

Dark is the default: `:root` holds the dark values, and `body.light-theme` overrides them. There is no `.dark-theme` rule in CSS — dark is simply the absence of `light-theme`.

`main.js` reads `localStorage.theme` (default `'dark'`) on load and toggles the `light-theme` class. Every page also runs a small inline script as the first thing in `<body>` that applies the same class before first paint, to avoid a flash of the wrong theme (FOUC) — copy this script verbatim into any new page. New theme-dependent styles belong in `global.css` as a variable pair, or as a `body.light-theme .selector { }` override next to the base rule.

The hero/page background photo (`baku_light.jpg`) is tinted per theme via the single `--hero-bg` variable — don't declare `--hero-bg` a second time inside `body.light-theme`, the later declaration silently wins and has previously washed out the light-mode overlay until it was collapsed back to one declaration.

The logo is swapped by JS between `logo.png` (white wordmark, for dark) and `logo_light.png` (navy/orange wordmark, for light) based on theme — `global.css` no longer applies any filter on top of it; don't re-add one, it would double up with the JS swap and invert the already-correct light logo.

### Language switching

`.lang` elements carry `data-az` and `data-en` attributes; the `#lang-switch` `<select>` swaps `innerHTML` from the matching attribute. Consequences to respect:

- Values are injected as HTML, so `<br>` inside them works (used in the hero headline) — but the attributes are the translation source and must stay HTML-safe.
- **Every `.lang` element needs both `data-az` and `data-en`.** `about.html` is currently incomplete (22 `data-az` vs 9 `data-en`), so switching to EN writes the string `null` into those elements. Add both attributes when adding `.lang` markup.
- Language is not persisted and resets to AZ on every navigation, unlike theme.
- The element's inline text should duplicate its `data-az` value, since that is what renders before any switch.

## Conventions

- Cards use `.glass-effect` (defined once in `global.css`, used by `about.css` and `services.css`) or `.stat-card` (translucent background + `backdrop-filter: blur()`), driven by `--card-bg` / `--card-hover` / `--border-color`.
- Accent color is `#c4642f` with `#b35624` for hover/border — hardcoded in `global.css` rather than tokenized.
- Sizing leans on `clamp()` for fluid type and spacing; prefer it over fixed px in new rules.
- `baku_light.jpg` is the hero background, set through the `--hero-bg` variable. `baku_light_2.jpg` is currently unreferenced.
