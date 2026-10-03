import { mediaSrc, mediaSrcSet } from "@/lib/media";
import { cn } from "@/lib/utils";

type M = Parameters<typeof mediaSrc>[0];

/** Responsive, lazy image from a Media row. Falls back to a typographic placeholder. */
export function Img({
  media,
  alt,
  className,
  sizes = "100vw",
  priority,
  size = "lg",
  fallback,
}: {
  media: M;
  alt?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  fallback?: React.ReactNode;
}) {
  const src = mediaSrc(media, size);
  if (!src) return <>{fallback ?? <div className={cn("bg-paper-3", className)} aria-hidden />}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      srcSet={mediaSrcSet(media)}
      sizes={sizes}
      alt={alt ?? media?.alt ?? ""}
      width={media?.width ?? undefined}
      height={media?.height ?? undefined}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      referrerPolicy="no-referrer"
      className={cn("object-cover", className)}
    />
  );
}

/** Placeholder block that reads as intentional: initials/monogram on paper. */
export function Monogram({ text, className, dark }: { text: string; className?: string; dark?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center font-display font-bold tracking-tight select-none",
        dark ? "bg-azure text-white/35" : "bg-paper-2 text-fg/20",
        className,
      )}
      aria-hidden
    >
      <span className="text-[clamp(2rem,6vw,5rem)]">{text}</span>
    </div>
  );
}
