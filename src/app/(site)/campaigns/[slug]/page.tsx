import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { getCampaign, hostOf } from "@/lib/campaigns";
import { mediaSrc } from "@/lib/media";
import { renderMarkdown } from "@/lib/markdown";
import { absoluteUrl, fmtDate, truncate } from "@/lib/utils";
import { Img } from "@/components/site/Img";
import { CampaignProgress } from "@/components/site/Campaign";
import { ShareButtons } from "@/components/site/ShareButtons";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = await getCampaign((await params).slug);
  if (!c) return {};
  const desc = c.seoDescription || c.summary || truncate(c.story, 160);
  const img = mediaSrc(c.image);
  return {
    title: c.seoTitle || c.title,
    description: desc || undefined,
    alternates: { canonical: `/campaigns/${c.slug}` },
    openGraph: { type: "article", title: c.title, description: desc || undefined, images: img ? [absoluteUrl(img)] : undefined },
  };
}

export default async function CampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  const c = await getCampaign((await params).slug);
  if (!c) notFound();
  const open = c.status === "ACTIVE";
  const host = hostOf(c.donateUrl);
  const pageUrl = absoluteUrl(`/campaigns/${c.slug}`);
  const donate = c.donateUrl ? (
    <a href={c.donateUrl} target="_blank" rel="noopener noreferrer" className="btn min-h-13 bg-gold px-7 text-base text-fg hover:bg-paper">
      {c.donateLabel || "Donate now"} <ArrowUpRight className="size-5" aria-hidden />
    </a>
  ) : null;

  return (
    <article>
      <header className="bg-royal text-paper">
        <div className="container-x grid gap-10 pb-14 pt-16 sm:pb-20 sm:pt-24 lg:grid-cols-12 lg:items-end">
          <div className={c.image ? "lg:col-span-7" : "lg:col-span-9"}>
            <nav aria-label="Breadcrumb" className="mb-6 text-sm text-paper/60"><Link href="/support" className="hover:text-paper">Support our work</Link></nav>
            <p className="eyebrow rise text-gold">
              {c.status === "CLOSED" ? "Appeal closed" : c.status === "GOAL_REACHED" ? "Target reached" : "Fundraising appeal"}
              {c.beneficiary && <span className="text-paper/60"> · For {c.beneficiary}</span>}
            </p>
            <h1 className="rise rise-2 mt-4 text-[clamp(2.5rem,6.5vw,5.5rem)] font-bold leading-[1.04]">{c.tagline || c.title}</h1>
            {c.summary && <p className="rise rise-3 mt-7 max-w-2xl font-serif text-xl leading-relaxed text-paper/85 sm:text-2xl">{c.summary}</p>}
            <div className="rise rise-4 mt-9 flex flex-wrap items-center gap-3">
              {open && donate}
              <ShareButtons dark url={pageUrl} title={c.title} text={c.summary || c.title} />
            </div>
          </div>
          {c.image && (
            <div className="lg:col-span-5">
              <Img media={c.image} priority size="xl" sizes="(min-width:1024px) 40vw, 100vw" className="aspect-[4/5] w-full rounded-sm" />
              {c.image.caption && <p className="mt-2 text-sm text-paper/60">{c.image.caption}</p>}
            </div>
          )}
        </div>
      </header>

      <div className="container-x grid max-w-6xl gap-12 py-14 sm:py-20 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {c.status !== "ACTIVE" && (
            <p className="mb-8 border-l-4 border-gold bg-paper-2 p-5 font-serif text-lg">
              {c.status === "GOAL_REACHED" ? "The target for this appeal has been reached. Thank you to everyone who gave and shared." : "This appeal is now closed. Thank you to everyone who gave and shared."}
            </p>
          )}
          {c.title !== (c.tagline || c.title) && <h2 className="mb-6 text-3xl font-bold text-royal sm:text-4xl">{c.title}</h2>}
          {c.story ? <div className="prose-ed" dangerouslySetInnerHTML={{ __html: renderMarkdown(c.story) }} /> : null}

          {c.howToGive && (
            <section aria-labelledby="how-to-give" className="mt-12 border-t border-line pt-10">
              <h2 id="how-to-give" className="mb-4 text-3xl font-bold">Other ways to give</h2>
              <div className="prose-ed" dangerouslySetInnerHTML={{ __html: renderMarkdown(c.howToGive) }} />
            </section>
          )}

          {c.updates.length > 0 && (
            <section aria-labelledby="campaign-updates" className="mt-12 border-t border-line pt-10">
              <h2 id="campaign-updates" className="mb-6 text-3xl font-bold">Updates</h2>
              <ol className="space-y-8">
                {c.updates.map((u) => (
                  <li key={u.id} className="border-l-2 border-gold pl-5">
                    <p className="eyebrow">{fmtDate(u.date)}</p>
                    <h3 className="mt-1 text-xl font-bold">{u.title}</h3>
                    {u.body && <p className="mt-2 whitespace-pre-line font-serif text-lg text-charcoal">{u.body}</p>}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <aside className="lg:col-span-5">
          <div className="border-t-4 border-cranberry bg-paper-2 p-6 sm:p-8 lg:sticky lg:top-24">
            <CampaignProgress c={c} donateUrl={c.donateUrl} />
            {open && c.donateUrl && (
              <a href={c.donateUrl} target="_blank" rel="noopener noreferrer" className="btn-primary mt-6 min-h-13 w-full text-base">
                {c.donateLabel || "Donate now"} <ArrowUpRight className="size-5" aria-hidden />
              </a>
            )}
            {open && host && (
              <p className="mt-4 text-sm text-stone">
                Donations are made on {host}, the official fundraising page for this appeal. This website does not collect money.
              </p>
            )}
            <div className="mt-6 border-t border-line pt-6">
              <p className="mb-3 text-sm font-semibold">Can&rsquo;t give right now? Sharing helps just as much.</p>
              <ShareButtons url={pageUrl} title={c.title} text={c.summary || c.title} />
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}
