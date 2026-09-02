// One-time media pipeline: media/raw/* -> resized/transcoded variants -> Vercel Blob -> media/manifest.json
//
// Usage:  npm run media            (process + upload everything, resumable)
//         npm run media -- --local  (process only, skip upload; manifest gets local paths for dev)
//
// Re-runs are cheap: processed outputs are cached in media/processed/ and uploads
// are recorded in media/.uploads.json, so only new/changed files do work.

import { readdir, mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const RAW = path.join(ROOT, "media/raw");
const OUT = path.join(ROOT, "media/processed");
const MANIFEST = path.join(ROOT, "media/manifest.json");
const UPLOAD_CACHE = path.join(ROOT, "media/.uploads.json");

const GRID_WIDTH = 720; // tile variant (tiles render at ~120-260px, 720 covers 2-3x DPR)
const FULL_WIDTH = 1440; // lightbox variant (source is 1440 wide, so this is native)
const VIDEO_WIDTH = 1280; // lightbox video
const PREVIEW_WIDTH = 640; // silent hover preview
const PREVIEW_SECONDS = 4;
const UPLOAD_CONCURRENCY = 6;

const LOCAL_ONLY = process.argv.includes("--local");
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic"]);
const VIDEO_EXT = new Set([".avi", ".mp4", ".mov", ".m4v"]);

if (!LOCAL_ONLY) {
  if (existsSync(path.join(ROOT, ".env.local"))) process.loadEnvFile(path.join(ROOT, ".env.local"));
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("BLOB_READ_WRITE_TOKEN missing. Run `vercel env pull .env.local` or use --local.");
    process.exit(1);
  }
}

// ---------- helpers ----------

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(`${cmd} ${args.join(" ")}\n${err}`))));
  });
}

async function probe(file) {
  const json = await run("ffprobe", [
    "-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=width,height:format=duration",
    "-of", "json", file,
  ]);
  const data = JSON.parse(json);
  const s = data.streams?.[0] ?? {};
  return { width: s.width, height: s.height, duration: Number(data.format?.duration ?? 0) };
}

// Sort by the camera's shot counter (PICT0005, MOVI0009 share one sequence), so photos and
// videos interleave chronologically. Falls back to name.
function shotNumber(name) {
  const m = name.match(/(\d+)/);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
}

async function lqip(input) {
  // 16px-wide blurred placeholder as a data URL, painted behind the tile until the real image lands.
  const buf = await sharp(input).rotate().resize({ width: 16 }).blur(1).webp({ quality: 40 }).toBuffer();
  return `data:image/webp;base64,${buf.toString("base64")}`;
}

function fresh(outFile, srcMtime) {
  // true if outFile exists and is newer than the source
  try {
    return existsSync(outFile) && statSyncMtime(outFile) >= srcMtime;
  } catch {
    return false;
  }
}
import { statSync } from "node:fs";
function statSyncMtime(f) { return statSync(f).mtimeMs; }

// ---------- processing ----------

async function processImage(src, id, srcMtime) {
  const gridOut = path.join(OUT, "grid", `${id}.webp`);
  const fullOut = path.join(OUT, "full", `${id}.webp`);

  const { info } = await sharp(src).rotate().toBuffer({ resolveWithObject: true });

  if (!fresh(gridOut, srcMtime)) {
    await sharp(src).rotate().resize({ width: GRID_WIDTH, withoutEnlargement: true }).webp({ quality: 82 }).toFile(gridOut);
  }
  if (!fresh(fullOut, srcMtime)) {
    await sharp(src).rotate().resize({ width: FULL_WIDTH, withoutEnlargement: true }).webp({ quality: 86 }).toFile(fullOut);
  }

  return {
    id, type: "photo", width: info.width, height: info.height,
    lqip: await lqip(src),
    files: { grid: gridOut, full: fullOut },
  };
}

async function processVideo(src, id, srcMtime) {
  const fullOut = path.join(OUT, "video", `${id}.mp4`);
  const previewOut = path.join(OUT, "preview", `${id}.mp4`);
  const posterPng = path.join(OUT, "poster", `${id}.png`);
  const posterOut = path.join(OUT, "poster", `${id}.webp`);

  const meta = await probe(src);

  // hqdn3d: light temporal/spatial denoise. Toy-camera MJPEG is noisy, and x264 would otherwise
  // spend most of its bits encoding sensor noise (~45MB -> ~26MB on the longest clip, no visible loss).
  const denoise = "hqdn3d=3:2:4:4";

  if (!fresh(fullOut, srcMtime)) {
    await run("ffmpeg", [
      "-y", "-i", src,
      "-vf", `${denoise},scale='min(${VIDEO_WIDTH},iw)':-2`,
      "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-c:a", "aac", "-b:a", "96k", "-ar", "44100",
      fullOut,
    ]);
  }
  if (!fresh(previewOut, srcMtime)) {
    await run("ffmpeg", [
      "-y", "-i", src, "-t", String(PREVIEW_SECONDS), "-an",
      "-vf", `${denoise},scale='min(${PREVIEW_WIDTH},iw)':-2,fps=24`,
      "-c:v", "libx264", "-preset", "slow", "-crf", "28", "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      previewOut,
    ]);
  }
  if (!fresh(posterOut, srcMtime)) {
    // grab a frame ~0.5s in (first frames on toy cameras are often black/blown out)
    const seek = Math.min(0.5, Math.max(0, meta.duration - 0.1));
    await run("ffmpeg", ["-y", "-ss", String(seek), "-i", src, "-frames:v", "1", posterPng]);
    await sharp(posterPng).resize({ width: GRID_WIDTH, withoutEnlargement: true }).webp({ quality: 82 }).toFile(posterOut);
  }

  return {
    id, type: "video", width: meta.width, height: meta.height, duration: Math.round(meta.duration * 10) / 10,
    lqip: await lqip(posterPng),
    files: { full: fullOut, preview: previewOut, poster: posterOut },
  };
}

// ---------- upload ----------

async function loadJson(file, fallback) {
  try { return JSON.parse(await readFile(file, "utf8")); } catch { return fallback; }
}

async function uploadAll(entries) {
  const { put } = await import("@vercel/blob");
  const cache = await loadJson(UPLOAD_CACHE, {});
  const jobs = [];

  for (const e of entries) {
    for (const [kind, file] of Object.entries(e.files)) {
      const key = path.relative(OUT, file); // e.g. grid/PICT0005.webp
      const mtime = (await stat(file)).mtimeMs;
      if (cache[key] && cache[key].mtime >= mtime) { e.urls ??= {}; e.urls[kind] = cache[key].url; continue; }
      jobs.push(async () => {
        const body = await readFile(file);
        const contentType = file.endsWith(".mp4") ? "video/mp4" : "image/webp";
        const blob = await put(key, body, {
          access: "public", addRandomSuffix: false, allowOverwrite: true, contentType,
          cacheControlMaxAge: 60 * 60 * 24 * 365,
        });
        cache[key] = { url: blob.url, mtime };
        e.urls ??= {}; e.urls[kind] = blob.url;
        process.stdout.write(`  ↑ ${key}\n`);
      });
    }
  }

  console.log(`Uploading ${jobs.length} file(s) (${Object.keys(cache).length} cached)…`);
  let i = 0;
  await Promise.all(Array.from({ length: UPLOAD_CONCURRENCY }, async () => {
    while (i < jobs.length) { const job = jobs[i++]; await job(); }
  }));
  await writeFile(UPLOAD_CACHE, JSON.stringify(cache, null, 2));
}

// ---------- main ----------

async function main() {
  for (const d of ["grid", "full", "video", "preview", "poster"]) await mkdir(path.join(OUT, d), { recursive: true });

  const names = (await readdir(RAW))
    .filter((n) => !n.startsWith("."))
    .sort((a, b) => shotNumber(a) - shotNumber(b) || a.localeCompare(b));

  const entries = [];
  let n = 0;
  for (const name of names) {
    const ext = path.extname(name).toLowerCase();
    const id = path.basename(name, ext);
    const src = path.join(RAW, name);
    const srcMtime = (await stat(src)).mtimeMs;
    n++;
    if (IMAGE_EXT.has(ext)) {
      process.stdout.write(`[${n}/${names.length}] photo ${id}\n`);
      entries.push(await processImage(src, id, srcMtime));
    } else if (VIDEO_EXT.has(ext)) {
      process.stdout.write(`[${n}/${names.length}] video ${id} (transcoding)\n`);
      entries.push(await processVideo(src, id, srcMtime));
    } else {
      console.warn(`  skipping ${name} (unknown type)`);
    }
  }

  if (LOCAL_ONLY) {
    for (const e of entries) {
      e.urls = Object.fromEntries(Object.entries(e.files).map(([k, f]) => [k, "/" + path.relative(ROOT, f)]));
    }
  } else {
    await uploadAll(entries);
  }

  const manifest = entries.map((e) => ({
    id: e.id,
    type: e.type,
    width: e.width,
    height: e.height,
    ...(e.duration ? { duration: e.duration } : {}),
    gridUrl: e.type === "photo" ? e.urls.grid : e.urls.poster,
    fullUrl: e.urls.full,
    ...(e.type === "video" ? { posterUrl: e.urls.poster, previewUrl: e.urls.preview } : {}),
    lqip: e.lqip,
  }));

  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  const photos = manifest.filter((m) => m.type === "photo").length;
  console.log(`\nWrote ${MANIFEST}: ${manifest.length} items (${photos} photos, ${manifest.length - photos} videos)`);
}

main().catch((err) => { console.error(err); process.exit(1); });
