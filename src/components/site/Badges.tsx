import type { Verification } from "@prisma/client";
import { cn, humanize } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

export function VerificationBadge({ v, className, dark }: { v?: Verification | null; className?: string; dark?: boolean }) {
  if (!v || v === "VERIFIED") return null;
  const label = v === "NEEDS_VERIFICATION" ? "Needs verification" : v === "CONFLICTING" ? "Sources conflict" : "Unverified";
  return (
    <span
      title="This record comes from public sources and hasn't been confirmed by the club yet."
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 font-cond text-[0.65rem] font-medium uppercase tracking-wider",
        dark ? "border-white/70 bg-white/10 text-white" : "border-gold bg-gold/15 text-fg",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", dark ? "bg-white" : "bg-gold")} aria-hidden />
      {label}
    </span>
  );
}

// Rotaract bodies wear Cranberry, Rotary bodies wear Royal Blue (as in the official signatures).
const ORG_TONE: Record<string, string> = {
  ROTARACT_CLUB: "bg-white text-cranberry ring-1 ring-inset ring-cranberry",
  ROTARACT_DISTRICT: "bg-white text-cranberry ring-1 ring-inset ring-cranberry",
  ROTARY_CLUB: "bg-white text-royal ring-1 ring-inset ring-royal",
  ROTARY_DISTRICT: "bg-white text-royal ring-1 ring-inset ring-royal",
  ROTARY_INTERNATIONAL: "bg-white text-royal ring-1 ring-inset ring-royal",
};

export function OrganizerTag({ name, type, self, className }: { name?: string | null; type?: string | null; self?: boolean; className?: string }) {
  if (!name) return null;
  return (
    <span
      className={cn(
        "font-cond inline-flex max-w-full items-center rounded-sm px-2 py-0.5 text-[0.75rem] font-bold uppercase tracking-wide",
        self ? "bg-cranberry text-white" : ORG_TONE[type || ""] || "bg-paper-2 text-fg ring-1 ring-inset ring-line",
        className,
      )}
    >
      <span className="truncate">{name}</span>
    </span>
  );
}

export function SourceNote({ source, url, className }: { source?: string | null; url?: string | null; className?: string }) {
  if (!source && !url) return null;
  let host = "";
  try {
    host = url ? new URL(url).hostname.replace(/^www\./, "") : "";
  } catch {}
  return (
    <p className={cn("text-xs text-stone", className)}>
      <span className="font-semibold uppercase tracking-wider">Source</span>{" "}
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="link-u inline-flex items-center gap-1">
          {source || host}
          <ExternalLink className="size-3" aria-hidden />
        </a>
      ) : (
        source
      )}
    </p>
  );
}

export function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full border border-line px-2.5 py-0.5 text-xs text-stone", className)}>{children}</span>;
}

export function StatusPill({ status, dark }: { status: string; dark?: boolean }) {
  if (dark) return <span className="inline-flex items-center rounded-full bg-paper px-2.5 py-0.5 text-xs font-semibold text-fg">{humanize(status)}</span>;
  const tone: Record<string, string> = {
    COMPLETED: "bg-grass/10 text-fg border-grass/30",
    ONGOING: "bg-cranberry/10 text-cranberry border-cranberry/30",
    IMPLEMENTATION: "bg-cranberry/10 text-cranberry border-cranberry/30",
    CONFIRMED: "bg-grass/10 text-fg border-grass/30",
    TENTATIVE: "bg-gold/15 text-charcoal border-gold/50",
    CANCELLED: "bg-royal/5 text-stone border-line line-through",
    REPORTED: "bg-azure/10 text-azure border-azure/30",
  };
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", tone[status] || "border-line text-stone")}>{humanize(status)}</span>;
}
