"use client";

import { useEffect, useRef } from "react";

// Living gradient mesh: blurred colour blobs on independent eased orbits, a film-grain
// canvas over the top, and a vignette. Pure DOM + canvas, no WebGL.
// Technique after miaai-lab's "Breathe" (no. 009); palette and pacing are our own.

const ORBITS = [
  { ax: 18, ay: 14, px: 29, py: 37, ph: 0.0, rot: 0.010, sc: 0.10 },
  { ax: 22, ay: 12, px: 43, py: 33, ph: 1.7, rot: -0.008, sc: 0.12 },
  { ax: 16, ay: 18, px: 35, py: 47, ph: 3.1, rot: 0.012, sc: 0.09 },
  { ax: 20, ay: 16, px: 49, py: 31, ph: 4.4, rot: -0.011, sc: 0.14 },
  { ax: 14, ay: 20, px: 59, py: 39, ph: 5.6, rot: 0.007, sc: 0.08 },
];

// sine with a soft "hesitation" at the extremes, so the drift breathes rather than swings
function easeWave(t: number) {
  const s = Math.sin(t);
  return Math.sign(s) * Math.abs(s) ** 0.8;
}

export function Mesh() {
  const meshRef = useRef<HTMLDivElement>(null);
  const grainRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    const grain = grainRef.current;
    if (!mesh || !grain) return;

    const canvas: HTMLCanvasElement = grain;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const blobs = Array.from(mesh.children) as HTMLElement[];

    // ---- blobs ----
    let sim = Math.random() * 200; // start somewhere along the orbit so each visit differs
    let last = performance.now();

    function moveBlobs(now: number) {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      sim += dt;
      const vw = window.innerWidth / 100;
      const vh = window.innerHeight / 100;
      blobs.forEach((b, i) => {
        const o = ORBITS[i];
        const x = easeWave(sim * ((2 * Math.PI) / o.px) + o.ph) * o.ax * vw;
        const y = easeWave(sim * ((2 * Math.PI) / o.py) + o.ph * 1.3) * o.ay * vh;
        const s = 1 + Math.sin(sim * 0.35 + o.ph) * o.sc;
        const r = (sim * o.rot * 57.3) % 360;
        b.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${r.toFixed(2)}deg) scale(${s.toFixed(3)})`;
      });
    }

    // ---- grain ----
    const ctx = canvas.getContext("2d");
    let frames: ImageData[] = [];
    let frameIndex = 0;

    function buildGrain() {
      if (!ctx) return;
      // render at reduced resolution; the softness reads as film, and it's ~3x cheaper
      const scale = 0.6;
      const w = Math.ceil(window.innerWidth * scale);
      const h = Math.ceil(window.innerHeight * scale);
      canvas.width = w;
      canvas.height = h;
      frames = [];
      const count = reduce ? 1 : 3;
      for (let f = 0; f < count; f++) {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          const v = 110 + Math.random() * 90; // mid-grey noise, overlay-blended
          d[i] = d[i + 1] = d[i + 2] = v;
          d[i + 3] = 255;
        }
        frames.push(img);
      }
      ctx.putImageData(frames[0], 0, 0);
    }

    let tick = 0;
    function drawGrain() {
      if (!ctx || reduce) return;
      if (++tick % 4 !== 0) return; // ~15fps flicker
      frameIndex = (frameIndex + 1) % frames.length;
      ctx.putImageData(frames[frameIndex], 0, 0);
    }

    // ---- loop ----
    let raf = 0;
    function frame(now: number) {
      moveBlobs(now);
      drawGrain();
      raf = requestAnimationFrame(frame);
    }

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(buildGrain, 150);
    };
    const onVisibility = () => {
      last = performance.now();
    };

    buildGrain();
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    if (reduce) {
      moveBlobs(performance.now());
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <>
      <div className="mesh" ref={meshRef} aria-hidden="true">
        <div className="blob blob--1" />
        <div className="blob blob--2" />
        <div className="blob blob--3" />
        <div className="blob blob--4" />
        <div className="blob blob--5" />
      </div>
      <canvas className="grain" ref={grainRef} aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
    </>
  );
}
