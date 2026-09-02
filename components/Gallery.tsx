"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Filter, MediaItem } from "@/lib/media";
import { Tile } from "./Tile";
import { Lightbox } from "./Lightbox";
import { useDockMagnify } from "./useDockMagnify";

interface Props {
  items: MediaItem[];
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "photo", label: "Photos" },
  { key: "video", label: "Videos" },
];

export function Gallery({ items }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<number | null>(null);
  const [slideshow, setSlideshow] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.type === filter)),
    [items, filter],
  );
  const counts = useMemo(
    () => ({
      all: items.length,
      photo: items.filter((i) => i.type === "photo").length,
      video: items.filter((i) => i.type === "video").length,
    }),
    [items],
  );

  useDockMagnify(gridRef, open === null);

  // if the set shrinks under an open lightbox, close it
  useEffect(() => {
    if (open !== null && open >= filtered.length) setOpen(null);
  }, [open, filtered.length]);

  const close = useCallback(() => { setOpen(null); setSlideshow(false); }, []);
  const playAll = useCallback(() => {
    if (!filtered.length) return;
    setOpen(0);
    setSlideshow(true);
  }, [filtered.length]);

  if (!items.length) {
    return <p className="empty">Nothing here yet.</p>;
  }

  return (
    <>
      <div className="toolbar">
        <div className="seg" role="group" aria-label="Show">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <small>{counts[f.key]}</small>
            </button>
          ))}
        </div>
        <button type="button" className="btn" onClick={playAll} disabled={!filtered.length}>
          Play all
        </button>
      </div>

      <div className={open === null ? "grid" : "grid is-dimmed"} ref={gridRef} key={filter}>
        {filtered.map((item, i) => (
          <Tile key={item.id} item={item} index={i} total={filtered.length} onOpen={setOpen} />
        ))}
      </div>

      {open !== null && filtered[open] && (
        <Lightbox
          items={filtered}
          index={open}
          slideshow={slideshow}
          onIndex={setOpen}
          onSlideshow={setSlideshow}
          onClose={close}
        />
      )}
    </>
  );
}
