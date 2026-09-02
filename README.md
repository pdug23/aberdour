# Aberdour

A minimal gallery for photos and videos from a trip to Aberdour, Fife (28 to 31 August 2026).
Unlisted; no auth; `noindex`.

## Stack

- Next.js (App Router), static prerender, deployed on Vercel
- Media in Vercel Blob (store `aberdour-media`). The repo holds only code and `media/manifest.json` (URLs + dimensions).
- No UI libraries. Plain CSS in `app/globals.css`; one client island (`components/Gallery.tsx`) owns filter, lightbox and slideshow state.

## Run

```
npm install
npm run dev        # http://localhost:3000
npm run build
```

## Deploy

GitHub `pdug23/aberdour` is connected to the Vercel project: every push to `main` deploys production
at https://aberdour.vercel.app. `vercel deploy --prod` from the CLI still works as a manual fallback.

## Media pipeline

Drop originals into `media/raw/` (gitignored), then:

```
vercel env pull .env.local   # gets BLOB_READ_WRITE_TOKEN (already done once)
npm run media                # process + upload + write media/manifest.json
npm run media -- --local     # process only, no upload (manifest points at local files)
```

`scripts/process-media.mjs` needs `ffmpeg`/`ffprobe` on PATH (`brew install ffmpeg`).
Re-runs are incremental: outputs cached in `media/processed/`, uploads recorded in `media/.uploads.json`.
Variants per item: photos get `grid` (720w webp) + `full` (1440w webp); videos get `video` (1280w H.264 mp4,
denoised), `preview` (4s muted 640w mp4 for hover) and `poster` (webp). Items are ordered by the camera's
shot counter so photos and videos interleave chronologically.

## Structure

- `app/` layout, page, global CSS
- `components/Mesh.tsx` drifting gradient-mesh background + grain + vignette
- `components/Gallery.tsx` toolbar, grid, lightbox wiring
- `components/Tile.tsx` grid tile with LQIP fade-in and hover video preview
- `components/Lightbox.tsx` overlay with keyboard/swipe nav and slideshow
- `components/useDockMagnify.ts` Dock-style hover magnification (writes CSS vars directly, no React state)
- `lib/media.ts` types and site constants (dates, coordinates)
- `scripts/process-media.mjs` media pipeline
- `PROMPT.md` original build brief
