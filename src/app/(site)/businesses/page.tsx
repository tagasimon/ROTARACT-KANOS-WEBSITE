import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { businessCardInclude, KIND_LABEL, publicBusiness } from "@/lib/businesses";
import { PageHero, Empty } from "@/components/site/Section";
import { BusinessCard } from "@/components/site/BusinessCard";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Member Businesses",
  description: "Businesses and professional services run by members of Rotaract Club Kampala North, and the club's corporate members.",
  alternates: { canonical: "/businesses" },
};

type SP = { q?: string; category?: string; kind?: string };

function hrefWith(sp: SP, patch: Partial<SP>) {
  const next = { ...sp, ...patch };
  const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => !!v) as [string, string][]).toString();
  return qs ? `/businesses?${qs}` : "/businesses";
}

export default async function BusinessesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (sp.q || "").trim().slice(0, 80);
  const kind = sp.kind === "CORPORATE_MEMBER" || sp.kind === "MEMBER_BUSINESS" ? sp.kind : undefined;

  const where: Prisma.BusinessWhereInput = { ...publicBusiness };
  if (kind) where.kind = kind;
  if (sp.category) where.category = sp.category;
  if (q) where.OR = ["name", "tagline", "description", "services", "category", "location"].map((f) => ({ [f]: { contains: q, mode: "insensitive" } }));

  const [list, categories, total] = await Promise.all([
    db.business.findMany({ where, include: businessCardInclude, orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { name: "asc" }] }),
    db.business.groupBy({ by: ["category"], where: { ...publicBusiness, category: { not: null } }, _count: true, orderBy: { category: "asc" } }),
    db.business.count({ where: publicBusiness }),
  ]);
  const filtered = !!(q || kind || sp.category);
  const pill = (on: boolean) => cn("inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold transition-colors", on ? "border-royal bg-royal text-paper" : "border-fg/20 hover:border-royal");

  return (
    <>
      <PageHero eyebrow="Member businesses" title={<>Work with the people<br />behind the club.</>} intro="Our members are lawyers, doctors, engineers, founders and makers. This is where to find what they do, and the organisations that have joined us as corporate members." />
      <section className="container-x py-14">
        {total === 0 ? (
          <Empty title="The directory is being put together">Members&rsquo; businesses and our corporate members will be listed here soon.</Empty>
        ) : (
          <>
            <form action="/businesses" role="search" className="mb-6 flex max-w-xl gap-2">
              {kind && <input type="hidden" name="kind" value={kind} />}
              {sp.category && <input type="hidden" name="category" value={sp.category} />}
              <label htmlFor="biz-q" className="sr-only">Search businesses and services</label>
              <input id="biz-q" name="q" type="search" defaultValue={q} placeholder="Search a business or a service, e.g. accounting" className="input min-h-12 text-base" />
              <button className="btn-ink min-h-12"><Search className="size-4" aria-hidden /> Search</button>
            </form>
            <nav aria-label="Listing type" className="mb-3 flex flex-wrap gap-2">
              <Link href={hrefWith(sp, { kind: undefined })} className={pill(!kind)} aria-current={!kind ? "true" : undefined}>All</Link>
              {(["MEMBER_BUSINESS", "CORPORATE_MEMBER"] as const).map((k) => (
                <Link key={k} href={hrefWith(sp, { kind: k })} className={pill(kind === k)} aria-current={kind === k ? "true" : undefined}>{KIND_LABEL[k]}{k === "MEMBER_BUSINESS" ? "es" : "s"}</Link>
              ))}
            </nav>
            {categories.length > 1 && (
              <nav aria-label="Category" className="mb-10 flex flex-wrap gap-2">
                {categories.map((c) => (
                  <Link key={c.category} href={hrefWith(sp, { category: sp.category === c.category ? undefined : c.category! })} className={cn(pill(sp.category === c.category), "min-h-9 px-3 text-xs")} aria-current={sp.category === c.category ? "true" : undefined}>
                    {c.category} <span className={cn("ml-1.5 font-normal", sp.category === c.category ? "text-paper/70" : "text-stone")}>{c._count}</span>
                  </Link>
                ))}
              </nav>
            )}
            <p className="mb-6 text-sm text-stone" aria-live="polite">
              {list.length} {list.length === 1 ? "listing" : "listings"}{filtered && <> · <Link href="/businesses" className="link-u">Clear filters</Link></>}
            </p>
            {list.length ? (
              <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {list.map((b) => <li key={b.id}><BusinessCard b={b} /></li>)}
              </ul>
            ) : (
              <Empty title="Nothing matches that search">Try a different word, or <Link href="/businesses" className="link-u">see every listing</Link>.</Empty>
            )}
          </>
        )}
        <p className="mt-14 max-w-2xl border-t border-line pt-6 text-sm text-stone">
          Listings are provided by members. The club does not endorse or guarantee any product or service. Are you a member with a business to list? <Link href="/get-involved?type=CONTACT" className="link-u">Tell the club admin</Link>.
        </p>
      </section>
    </>
  );
}
