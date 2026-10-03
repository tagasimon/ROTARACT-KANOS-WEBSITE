import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionHead({
  index,
  eyebrow,
  title,
  intro,
  href,
  hrefLabel = "See all",
  dark,
  className,
}: {
  index?: string;
  eyebrow: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  href?: string;
  hrefLabel?: string;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("mb-10 grid gap-6 md:mb-14 md:grid-cols-12 md:items-end", className)}>
      <div className="md:col-span-8">
        <p className={cn("eyebrow mb-4 flex items-center gap-3", dark && "text-paper/60")}>
          {index && <span className={cn("font-cond text-cranberry", dark && "text-gold")}>{index}</span>}
          <span className={cn("h-px w-8", dark ? "bg-paper/30" : "bg-royal/25")} aria-hidden />
          {eyebrow}
        </p>
        <h2 className={cn("text-4xl font-bold leading-[1.06] sm:text-5xl lg:text-6xl", dark && "text-paper")}>{title}</h2>
      </div>
      <div className="flex flex-col gap-4 md:col-span-4 md:items-end md:text-right">
        {intro && <p className={cn("max-w-sm font-serif text-lg leading-snug text-stone", dark && "text-paper/70")}>{intro}</p>}
        {href && (
          <Link href={href} className={cn("group inline-flex items-center gap-1.5 text-sm font-semibold", dark ? "text-paper" : "text-fg")}>
            <span className="link-u">{hrefLabel}</span>
            <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  intro,
  children,
  dark = true,
}: {
  eyebrow: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  children?: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <section className={cn("grain overflow-hidden", dark ? "bg-royal text-paper" : "bg-paper-2")}>
      <div className="container-x pb-14 pt-16 sm:pb-20 sm:pt-24">
        <p className={cn("eyebrow rise mb-6", dark && "text-paper/60")}>{eyebrow}</p>
        <h1 className="rise rise-2 max-w-5xl text-[clamp(2.75rem,7vw,6.5rem)] font-bold leading-[1.04]">{title}</h1>
        {intro && <div className={cn("rise rise-3 mt-8 max-w-2xl font-serif text-xl leading-relaxed", dark ? "text-paper/75" : "text-stone")}>{intro}</div>}
        {children && <div className="rise rise-4 mt-10">{children}</div>}
      </div>
    </section>
  );
}

export function Empty({ title, children, dark }: { title: string; children?: React.ReactNode; dark?: boolean }) {
  return (
    <div className={cn("rounded-lg border border-dashed p-8 text-center sm:p-12", dark ? "border-paper/25 text-paper/70" : "border-fg/20 text-stone")}>
      <p className={cn("font-display text-xl font-semibold", dark ? "text-paper" : "text-fg")}>{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md font-serif text-base">{children}</div>}
    </div>
  );
}
