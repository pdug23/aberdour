import manifest from "@/media/manifest.json";
import type { MediaItem } from "@/lib/media";
import { Header } from "@/components/Header";
import { Gallery } from "@/components/Gallery";

export default function Page() {
  const items = manifest as MediaItem[];
  return (
    <main>
      <Header />
      <Gallery items={items} />
    </main>
  );
}
