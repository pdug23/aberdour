"use client";

import { useEffect, useRef, useState } from "react";
import { formatDuration, type MediaItem } from "@/lib/media";

interface Props {
  item: MediaItem;
  index: number;
  total: number;
  onOpen: (index: number) => void;
}

const PREVIEW_DELAY = 140; // ms of hover before a video preview starts, so sweeping across the grid stays quiet

export function Tile({ item, index, total, onOpen }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [playing, setPlaying] = useState(false);
  const hoverTimer = useRef(0);

  // images already in cache can be complete before React attaches onLoad
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  const isVideo = item.type === "video";

  function enter(e: React.PointerEvent) {
    if (!isVideo || e.pointerType !== "mouse") return;
    hoverTimer.current = window.setTimeout(() => setPreviewing(true), PREVIEW_DELAY);
  }
  function leave() {
    window.clearTimeout(hoverTimer.current);
    setPreviewing(false);
    setPlaying(false);
  }

  const label = isVideo
    ? `Video ${index + 1} of ${total}, ${formatDuration(item.duration ?? 0)}`
    : `Photo ${index + 1} of ${total}`;

  return (
    <button
      type="button"
      className="tile"
      data-type={item.type}
      style={{ ["--i" as string]: index, backgroundImage: item.lqip ? `url(${item.lqip})` : undefined }}
      onClick={() => onOpen(index)}
      onPointerEnter={enter}
      onPointerLeave={leave}
      aria-label={label}
    >
      <img
        ref={imgRef}
        className={loaded ? "is-loaded" : undefined}
        src={item.gridUrl}
        alt=""
        width={item.width}
        height={item.height}
        loading={index < 24 ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setLoaded(true)}
      />
      {isVideo && previewing && item.previewUrl && (
        <video
          className={playing ? "is-playing" : undefined}
          src={item.previewUrl}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          onPlaying={() => setPlaying(true)}
        />
      )}
      {isVideo && item.duration != null && (
        <span className="tile__meta" aria-hidden="true">{formatDuration(item.duration)}</span>
      )}
    </button>
  );
}
