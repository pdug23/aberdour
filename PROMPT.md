Build a minimal, artistic photo/video gallery site for a trip to Aberdour, Scotland (28–31 August 2026). This needs to look genuinely impressive and polished — not templated, not "AI slop." Take real design risks on motion and typography; keep everything else restrained.

## Stack

- Next.js, App Router, deployed on Vercel
- Media (186 photos + videos) lives in Vercel Blob, not in the repo. Read `media/manifest.json` (you'll generate this via a processing script — see "Media pipeline" below) to get item URLs, type, and dimensions.
- No authentication. Unlisted `*.vercel.app` URL is fine.
- New dependencies beyond `@vercel/blob`, `sharp`, and a video-processing tool (e.g. `ffmpeg`/`fluent-ffmpeg`) need to be flagged to me before install — ask first if you think one is worth it (e.g. a video player library for smoother scrubbing).

## Reference aesthetic

Study this page's technique closely: https://miaai-lab.github.io/Fable-5.1-100-HTML-Files/009-morphing-gradient-mesh.html

It's a living gradient mesh background: several blurred, colour-tinted `div` blobs (`filter: blur()`, `mix-blend-mode: screen`) drifting independently via sine-wave-eased `translate3d` transforms, plus a subtle canvas grain overlay and a radial vignette. Pure CSS/vanilla JS, no WebGL, no libraries. Replicate this *technique*, not this exact palette or copy.

**Palette direction:** moody, late-summer-into-autumn Scotland — natural, not neon. Think: muted heather purple, deep sea teal, weathered gold/amber (like bracken turning), slate/stone grey-blue, maybe a faded coral for warmth. Desaturated and atmospheric rather than vivid. Propose 1–2 palette options in this direction if it helps, but default to shipping one rather than building a picker — this site doesn't need a palette switcher like the reference does.

The reference site's typography approach (large italic serif display word, small-caps mono meta text) is the right register — adapt it, don't copy the exact words/sizes.

## Layout

- **Top-left:** "Aberdour" — large, striking display word. Use a system serif stack (e.g. `'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, ui-serif, serif`) at an italic/light weight, no font-loading dependency.
- **Top-right:** coordinates — `56.0556° N, 3.2989° W` — small, mono, letter-spaced, uppercase, quiet (matches the reference site's meta text style).
- **Top-center (near the header):** the date range in minimal numeric format — `28.08.26–31.08.26`.
- **Filter control** (below header, simple): **All / Photos / Videos** toggle. Filters the grid in place.
- **Main content:** a single uniform, square-ish grid of all 186 items. No albums, no sections, no captions. Grid should feel calm and consistent — the interaction is where the personality lives, not the layout.

## Grid interaction

- **Hover:** the hovered tile scales up slightly in place, similar to macOS Dock magnification — a smooth, springy scale transform, ideally with neighboring tiles subtly responding (even a faint falloff) rather than a hard cutoff. No layout shift — use transform, not size/grid changes.
- **Hover on a video tile:** starts autoplaying muted, silently, for a few seconds as a preview (like a YouTube thumbnail hover), then stops/resets when hover ends or after the preview window.
- **Click:** the item expands into an overlay that sits on top of the page — not fullscreen/native browser fullscreen, but large enough to dominate the viewport with the gradient background still visible/dimmed behind it. Photos enlarge; videos enlarge and autoplay (with sound this time, and normal controls).
- **Navigation inside the overlay:** left/right arrow keys and on-screen prev/next buttons move through the *currently filtered* set (respects the All/Photos/Videos toggle). Wrap or stop at the ends — your call, pick whichever feels cleaner.
- **Slideshow mode:** a button that starts auto-advancing through the current filtered set on a timer (a few seconds per item — landing on ~3–4s is reasonable, use your judgement). While slideshow is active, show a play/pause control; clicking it pauses/stops the auto-advance without closing the overlay. Should reuse the same overlay/navigation as manual click-through, not a separate mode.
- Keep all of this snappy — no long transition delays that make browsing 186 items feel slow.

## Media pipeline (build this first, as a script — not part of the Next.js app runtime)

Write a one-time Node script in `scripts/` that:
1. Reads every file in `media/raw/`.
2. For images: normalizes EXIF orientation, generates a grid-thumbnail size and a larger lightbox size (via `sharp`), strips EXIF otherwise.
3. For videos: generates a short muted preview-friendly version if needed for the hover-preview (or just reuse the source if it's already small — these are toy-camera files, likely already low-res/small), plus a poster frame image for the grid tile before hover/play.
4. Uploads all processed variants to Vercel Blob.
5. Writes `media/manifest.json`: an array of `{ id, type: "photo"|"video", gridUrl, fullUrl, posterUrl? (video only), width, height }`.

The Next.js app should treat `manifest.json` as its only data source — don't hit Blob's list API at runtime, just read the manifest (checked into the repo, since it's just URLs + metadata, not binaries).

## Explicitly out of scope

- No captions, no dates-per-photo, no albums/sections, no auth, no upload UI in the app itself (uploading is the one-time script's job).

## Before you start

If anything above is ambiguous or you think a different technical approach serves the brief better, say so and propose it rather than guessing silently — this is a from-scratch build and I'd rather correct direction early than unwind it later.
