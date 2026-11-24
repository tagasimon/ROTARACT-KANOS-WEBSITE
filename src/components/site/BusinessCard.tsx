import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { KIND_LABEL, servicesOf, type BusinessCardData } from "@/lib/businesses";
import { cn, initials, truncate } from "@/lib/utils";
import { Img } from "@/components/site/Img";

export function BusinessLogo({ b, className }: { b: Pick<BusinessCardData, "name" | "logo">; className?: string }) {
  return (
    <div className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-sm border border-line bg-white", className)}>
      {b.logo ? (
        <Img media={b.logo} alt={`${b.name} logo`} size="sm" sizes="96px" className="size-full object-contain p-2" />
      ) : (
        <span className="font-display text-xl font-bold text-royal" aria-hidden>{initials(b.name)}</span>
      )}
    </div>
  );
}

export function BusinessCard({ b }: { b: BusinessCardData }) {
  const services = servicesOf(b);
  return (
    <Link href={`/businesses/${b.slug}`} className="group flex h-full flex-col rounded-sm border border-line bg-white p-6 transition-colors hover:border-royal">
      <div className="flex items-start gap-4">
        <BusinessLogo b={b} className="size-16" />
        <div className="min-w-0 flex-1">
          <p className="eyebrow">
            {b.kind === "CORPORATE_MEMBER" ? <span className="text-cranberry">{KIND_LABEL[b.kind]}</span> : b.category || KIND_LABEL[b.kind]}
            {b.kind === "CORPORATE_MEMBER" && b.category && <span> · {b.category}</span>}
          </p>
          <h3 className="mt-1 text-xl font-bold leading-tight group-hover:text-cranberry">{b.name}</h3>
        </div>
        <ArrowUpRight className="size-4 shrink-0 text-stone transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cranberry" aria-hidden />
      </div>
      {(b.tagline || b.description) && <p className="mt-4 font-serif text-lg leading-snug text-charcoal">{b.tagline || truncate(b.description, 140)}</p>}
      {services.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Products and services">
          {services.slice(0, 4).map((s) => <li key={s} className="rounded-full bg-paper-2 px-2.5 py-1 text-xs font-medium">{s}</li>)}
          {services.length > 4 && <li className="px-1 py-1 text-xs text-stone">+{services.length - 4} more</li>}
        </ul>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-5 text-sm text-stone">
        {b.owner?.isPublic && <span>{b.owner.honorific ? `${b.owner.honorific} ` : ""}<span className="font-semibold text-fg">{b.owner.name}</span></span>}
        {b.location && <span className="flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{b.location}</span>}
      </div>
    </Link>
  );
}
