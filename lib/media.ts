export type MediaType = "photo" | "video";

export interface MediaItem {
  id: string;
  type: MediaType;
  width: number;
  height: number;
  /** seconds, videos only */
  duration?: number;
  /** tile-sized image (photo) or poster frame (video) */
  gridUrl: string;
  /** lightbox image (photo) or mp4 (video) */
  fullUrl: string;
  posterUrl?: string;
  /** short muted mp4 for hover preview, videos only */
  previewUrl?: string;
  /** tiny blurred data URL painted behind the tile while it loads */
  lqip?: string;
}

export type Filter = "all" | "photo" | "video";

export const SITE = {
  name: "A weekend in Aberdour",
  dates: "28.08.26–31.08.26",
  coords: "56.0556° N, 3.2989° W",
} as const;

export function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
