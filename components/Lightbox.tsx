"use client";

import { useCallback, useEffect, useRef, type CSSProperties } from "react";
import type { MediaItem } from "@/lib/media";

interface Props {
  items: MediaItem[];
  index: number;
  slideshow: boolean;
  onIndex: (index: number) => void;
  onSlideshow: (on: boolean) => void;
  onClose: () => void;
}

const PHOTO_DWELL = 3600; // ms per photo in slideshow; videos play through and advance on end
const SWIPE = 44; // px

export function Lightbox({ items, index, slideshow, onIndex, onSlideshow, onClose }: Props) {
  const item = items[index];
  const count = items.length;
  const rootRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const go = useCallback(
    (delta: number) => onIndex((index + delta + count) % count),
    [index, count, onIndex],
  );

  // keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowRight": e.preventDefault(); go(1); break;
        case "ArrowLeft": e.preventDefault(); go(-1); break;
        case "Escape": e.preventDefault(); onClose(); break;
        case " ": e.preventDefault(); onSlideshow(!slideshow); break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose, onSlideshow, slideshow]);

  // lock page scroll, focus the dialog
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    rootRef.current?.focus();
    return () => { document.body.style.overflow = prev; };
  }, []);

  // photos advance on a timer; videos advance from onEnded
  useEffect(() => {
    if (!slideshow || item.type !== "photo") return;
    const t = window.setTimeout(() => go(1), PHOTO_DWELL);
    return () => window.clearTimeout(t);
  }, [slideshow, item, go]);

  // warm the neighbours
  useEffect(() => {
    for (const d of [1, -1]) {
      const n = items[(index + d + count) % count];
      if (n?.type === "photo") { const img = new Image(); img.src = n.fullUrl; }
    }
  }, [index, items, count]);

  // touch swipe
  function pointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse") return;
    pointerStart.current = { x: e.clientX, y: e.clientY };
  }
  function pointerUp(e: React.PointerEvent) {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  }

  const ratio = item.width / item.height;

  return (
    <div
      className="lb"
      role="dialog"
      aria-modal="true"
      aria-label={`${item.type === "video" ? "Video" : "Photo"} ${index + 1} of ${count}`}
      ref={rootRef}
      tabIndex={-1}
      onPointerDown={pointerDown}
      onPointerUp={pointerUp}
    >
      <div className="lb__backdrop" onClick={onClose} />

      <figure
        className="lb__stage"
        key={item.id}
        style={{ "--ar": ratio } as CSSProperties}
        onClick={() => { if (slideshow) onSlideshow(false); }}
      >
        {item.type === "photo" ? (
          <img src={item.fullUrl} alt="" width={item.width} height={item.height} decoding="async" />
        ) : (
          <video
            src={item.fullUrl}
            poster={item.posterUrl}
            autoPlay
            controls
            playsInline
            preload="auto"
            onEnded={() => { if (slideshow) go(1); }}
          />
        )}
      </figure>

      <button type="button" className="lb__nav lb__nav--prev" onClick={() => go(-1)} aria-label="Previous">
        ←
      </button>
      <button type="button" className="lb__nav lb__nav--next" onClick={() => go(1)} aria-label="Next">
        →
      </button>
      <button type="button" className="lb__close" onClick={onClose} aria-label="Close">
        ×
      </button>

      <div className="lb__bar">
        <span className="lb__count">
          {String(index + 1).padStart(String(count).length, "0")} / {count}
        </span>
        <button
          type="button"
          className="lb__play"
          aria-pressed={slideshow}
          onClick={() => onSlideshow(!slideshow)}
        >
          {slideshow ? "Pause" : "Play"}
        </button>
      </div>
    </div>
  );
}
