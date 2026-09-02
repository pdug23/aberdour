import { SITE } from "@/lib/media";

export function Header() {
  return (
    <header className="masthead">
      <p className="masthead__dates">{SITE.dates}</p>
      <h1 className="masthead__name">{SITE.name}</h1>
      <p className="masthead__coords">{SITE.coords}</p>
    </header>
  );
}
