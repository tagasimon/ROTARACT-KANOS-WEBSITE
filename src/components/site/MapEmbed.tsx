/** Lightweight OpenStreetMap embed — no client JS bundle, works on slow connections. */
export function MapEmbed({ lat, lng, label, className, zoom = 0.012 }: { lat: number; lng: number; label?: string; className?: string; zoom?: number }) {
  const bbox = [lng - zoom, lat - zoom * 0.6, lng + zoom, lat + zoom * 0.6].join(",");
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  return (
    <figure className={className}>
      <iframe title={label ? `Map: ${label}` : "Map"} src={src} loading="lazy" className="h-full min-h-64 w-full rounded-md border border-line grayscale-[35%]" />
      <figcaption className="mt-2 text-xs text-stone">
        {label}{" "}
        <a className="link-u" href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`} target="_blank" rel="noopener noreferrer">
          Open larger map
        </a>
      </figcaption>
    </figure>
  );
}
