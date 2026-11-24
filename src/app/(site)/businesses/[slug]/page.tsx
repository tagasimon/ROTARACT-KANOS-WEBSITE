import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Globe, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { KIND_LABEL, publicBusiness, servicesOf } from "@/lib/businesses";
import { personCardSelect } from "@/lib/queries";
import { mediaSrc } from "@/lib/media";
import { renderMarkdown } from "@/lib/markdown";
import { absoluteUrl, fmtDate, truncate } from "@/lib/utils";
import { Img } from "@/components/site/Img";
import { BusinessLogo } from "@/components/site/BusinessCard";
import { PersonCard } from "@/components/site/Cards";
import { JsonLd } from "@/components/site/JsonLd";

export const dynamic = "force-dynamic";

function load(slug: string) {
  return db.business.findFirst({ where: { slug, ...publicBusiness }, include: { logo: true, cover: true, owner: { select: { ...personCardSelect, isPublic: true } } } });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const b = await load((await params).slug);
  if (!b) return {};
  const desc = b.tagline || truncate(b.description, 160) || undefined;
  const img = mediaSrc(b.cover) || mediaSrc(b.logo);
  return { title: b.name, description: desc, alternates: { canonical: `/businesses/${b.slug}` }, openGraph: { title: b.name, description: desc, images: img ? [absoluteUrl(img)] : undefined } };
}

export default async function BusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const b = await load((await params).slug);
  if (!b) notFound();
  const services = servicesOf(b);
  const socials = ([["LinkedIn", b.linkedin], ["X", b.x], ["Instagram", b.instagram], ["Facebook", b.facebook]] as const).filter(([, v]) => !!v);
  const owner = b.owner?.isPublic ? b.owner : null;
  return (
    <article>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Organization", name: b.name, description: b.tagline || undefined, url: b.website || absoluteUrl(`/businesses/${b.slug}`), logo: mediaSrc(b.logo) ? absoluteUrl(mediaSrc(b.logo)!) : undefined, sameAs: socials.map(([, v]) => v) }} />
      <header className="bg-paper-2">
        <div className="container-x pb-12 pt-14 sm:pt-20">
          <nav aria-label="Breadcrumb" className="mb-8 text-sm text-stone"><Link href="/businesses" className="hover:text-fg">Member businesses</Link></nav>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <BusinessLogo b={b} className="size-24 sm:size-28" />
            <div>
              <p className="eyebrow"><span className="text-cranberry">{KIND_LABEL[b.kind]}</span>{b.category && <> · {b.category}</>}{b.kind === "CORPORATE_MEMBER" && b.memberSince && <> · since {fmtDate(b.memberSince, { month: "long", year: "numeric" })}</>}</p>
              <h1 className="mt-2 text-[clamp(2.25rem,5vw,4.5rem)] font-bold leading-[1.05]">{b.name}</h1>
              {b.tagline && <p className="mt-3 max-w-2xl font-serif text-xl text-stone sm:text-2xl">{b.tagline}</p>}
            </div>
          </div>
        </div>
      </header>

      <div className="container-x grid gap-12 py-14 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {b.cover && <Img media={b.cover} alt={b.cover.alt || b.name} priority size="xl" sizes="(min-width:1024px) 60vw, 100vw" className="mb-10 aspect-[16/9] w-full rounded-sm" />}
          {b.description ? <div className="prose-ed" dangerouslySetInnerHTML={{ __html: renderMarkdown(b.description) }} /> : null}
          {services.length > 0 && (
            <section aria-labelledby="services" className="mt-10">
              <h2 id="services" className="mb-4 text-2xl font-bold">Products and services</h2>
              <ul className="grid gap-x-8 sm:grid-cols-2">
                {services.map((s) => <li key={s} className="border-b border-line py-3 font-semibold">{s}</li>)}
              </ul>
            </section>
          )}
          {owner && (
            <section aria-labelledby="member" className="mt-14">
              <h2 id="member" className="mb-6 text-2xl font-bold">{b.kind === "CORPORATE_MEMBER" ? "Our contact at the club" : "The member behind it"}</h2>
              <div className="w-44"><PersonCard p={owner} role={b.ownerRole || undefined} /></div>
            </section>
          )}
        </div>
        <aside className="lg:col-span-4">
          <div className="space-y-5 border-t-4 border-cranberry bg-paper-2 p-6 lg:sticky lg:top-24">
            {b.contactUrl && <a href={b.contactUrl} target="_blank" rel="noopener noreferrer" className="btn-primary w-full">Enquire <ArrowUpRight className="size-4" aria-hidden /></a>}
            {b.website && <a href={b.website} target="_blank" rel="noopener noreferrer" className="btn-ghost w-full"><Globe className="size-4" aria-hidden /> Visit website</a>}
            {b.location && <p className="flex items-start gap-2 text-sm"><MapPin className="mt-0.5 size-4 shrink-0 text-stone" aria-hidden />{b.location}</p>}
            {socials.length > 0 && (
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
                {socials.map(([l, v]) => <li key={l}><a href={v!} target="_blank" rel="noopener noreferrer" className="link-u">{l}</a></li>)}
              </ul>
            )}
            <p className="border-t border-line pt-4 text-xs text-stone">This listing is provided by the member. The club does not endorse or guarantee any product or service.</p>
          </div>
        </aside>
      </div>
    </article>
  );
}
