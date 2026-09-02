"use client";

import { useEffect, type RefObject } from "react";

const PEAK = 0.22; // scale of the tile directly under the pointer (1 + PEAK)
const RADIUS = 1.05; // falloff radius in tile widths

interface Tracked {
  el: HTMLElement;
  cx: number;
  cy: number;
  s: number;
}

/**
 * macOS Dock-style magnification for a grid of `.tile` elements.
 * Each tile gets `--s` (scale) and `--lift` (0..1 shadow strength) set directly on its style,
 * outside React's render cycle. Tile centres are measured from offset geometry, which ignores
 * transforms, so we never read layout while tiles are mid-animation.
 */
export function useDockMagnify(gridRef: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let tiles: Tracked[] = [];
    let radius = 1;
    let px = 0;
    let py = 0;
    let raf = 0;
    let inside = false;

    function measure() {
      const rect = grid!.getBoundingClientRect();
      const ox = rect.left + window.scrollX;
      const oy = rect.top + window.scrollY;
      tiles = Array.from(grid!.querySelectorAll<HTMLElement>(".tile")).map((el) => ({
        el,
        cx: ox + el.offsetLeft + el.offsetWidth / 2,
        cy: oy + el.offsetTop + el.offsetHeight / 2,
        s: 1,
      }));
      radius = (tiles[0]?.el.offsetWidth ?? 160) * RADIUS;
    }

    function apply(t: Tracked, s: number) {
      if (Math.abs(t.s - s) < 0.002) return;
      t.s = s;
      const lift = (s - 1) / PEAK;
      t.el.style.setProperty("--s", s.toFixed(3));
      t.el.style.setProperty("--lift", lift.toFixed(3));
      t.el.style.zIndex = s > 1 ? String(1 + Math.round(lift * 20)) : "";
    }

    function update() {
      raf = 0;
      const r2 = radius * radius;
      for (const t of tiles) {
        const dx = px - t.cx;
        const dy = py - t.cy;
        const d2 = dx * dx + dy * dy;
        if (d2 > r2 * 9) { apply(t, 1); continue; } // beyond 3 radii: nothing
        const s = 1 + PEAK * Math.exp(-d2 / r2);
        apply(t, s < 1.005 ? 1 : s);
      }
    }

    function reset() {
      inside = false;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      for (const t of tiles) apply(t, 1);
    }

    const onMove = (e: PointerEvent) => {
      if (!active) return;
      inside = true;
      px = e.pageX;
      py = e.pageY;
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onLeave = () => reset();

    let resizeTimer = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => { measure(); if (inside) update(); }, 80);
    });

    measure();
    ro.observe(grid);
    grid.addEventListener("pointermove", onMove);
    grid.addEventListener("pointerleave", onLeave);
    if (!active) reset();

    return () => {
      reset();
      ro.disconnect();
      window.clearTimeout(resizeTimer);
      grid.removeEventListener("pointermove", onMove);
      grid.removeEventListener("pointerleave", onLeave);
    };
  }, [gridRef, active]);
}
