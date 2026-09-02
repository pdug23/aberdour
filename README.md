# Aberdour

A minimal, artistic gallery for photos and videos from a trip to Aberdour, Scotland (28–31 Aug 2026).

## Status

Scaffolded, not yet built. Media not yet added. See `PROMPT.md` for the full build brief handed to Fable.

## How this works

1. Drop the raw trip photos/videos into `media/raw/` (gitignored — never committed).
2. Run the processing script (once written) to normalize, resize, and upload them to Vercel Blob, generating `media/manifest.json`.
3. The Next.js app reads `manifest.json` and renders the gallery from Blob URLs.

## Structure

- `media/raw/` — your original files, local only, gitignored
- `scripts/` — one-time processing/upload script(s)
- `PROMPT.md` — the build brief for Fable

## Stack

- Next.js (App Router), deployed on Vercel
- Vercel Blob for photo/video storage
- No auth — unlisted `*.vercel.app` URL
