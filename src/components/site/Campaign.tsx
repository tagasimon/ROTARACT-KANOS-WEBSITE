import Link from "next/link";
import { ArrowUpRight, HeartHandshake } from "lucide-react";
import { campaignProgress, fmtMoney, fmtMoneyShort, hostOf, type CampaignMoney } from "@/lib/campaigns";
import { cn, fmtDate } from "@/lib/utils";
import { Img } from "@/components/site/Img";

/** Target, raised, remaining and a progress bar. With no "raised" figure it shows the target alone. */
export function CampaignProgress({ c, dark, donateUrl, className }: { c: CampaignMoney; dark?: boolean; donateUrl?: string | null; className?: string }) {
  const { goal, raised, percent, remaining } = campaignProgress(c);
  if (goal == null && raised == null) return null;
  const muted = dark ? "text-paper/70" : "text-stone";
  const host = hostOf(donateUrl);
  return (
    <div className={className}>
      {raised != null ? (
        <>
          <p className="font-display text-4xl font-bold leading-none tabular-nums sm:text-5xl">{fmtMoney(raised, c.currency)}</p>
          {goal != null && <p className={cn("mt-2 text-sm", muted)}>raised of the {fmtMoneyShort(goal, c.currency)} target</p>}
        </>
      ) : (
        <>
          <p className={cn("eyebrow", dark && "text-paper/60")}>Target</p>
          <p className="mt-1 font-display text-4xl font-bold leading-none sm:text-5xl">{fmtMoneyShort(goal!, c.currency)}</p>
        </>
      )}
      {percent != null && (
        <>
          <div
            role="progressbar"
            aria-label="Fundraising progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-valuetext={`${percent}% of the target raised`}
            className={cn("mt-5 h-3 overflow-hidden rounded-full", dark ? "bg-paper/20" : "bg-royal/10")}
          >
            <div className="h-full rounded-full bg-gold" style={{ width: `${Math.max(percent, 1.5)}%` }} />
          </div>
          <dl className={cn("mt-3 flex flex-wrap justify-between gap-x-6 gap-y-1 text-sm", muted)}>
            <div className="flex gap-1.5"><dt className="sr-only">Progress</dt><dd><strong className={dark ? "text-paper" : "text-fg"}>{percent}%</strong> of the target</dd></div>
            {remaining != null && remaining > 0 && <div className="flex gap-1.5"><dt>Still needed:</dt><dd><strong className={dark ? "text-paper" : "text-fg"}>{fmtMoney(remaining, c.currency)}</strong></dd></div>}
          </dl>
        </>
      )}
      <p className={cn("mt-3 text-xs", muted)}>
        {raised != null && c.raisedAsOf ? <>Amount updated {fmtDate(c.raisedAsOf)}. </> : null}
        {host ? <>{raised != null ? "The latest" : "The live"} total is on {host}.</> : null}
      </p>
    </div>
  );
}

type Featured = CampaignMoney & {
  slug: string;
  title: string;
  tagline: string | null;
  summary: string | null;
  beneficiary: string | null;
  donateUrl: string | null;
  donateLabel: string | null;
  image: Parameters<typeof Img>[0]["media"];
};

/** Homepage band for the campaign marked "Feature on the homepage". */
export function CampaignFeature({ c }: { c: Featured }) {
  return (
    <section aria-labelledby="campaign-feature-title" className="bg-royal text-paper">
      <div className="container-x grid gap-10 py-14 sm:py-20 lg:grid-cols-12 lg:items-center">
        {c.image && (
          <div className="lg:col-span-4">
            <Img media={c.image} size="lg" sizes="(min-width:1024px) 33vw, 100vw" className="aspect-[4/5] w-full rounded-sm" />
          </div>
        )}
        <div className={c.image ? "lg:col-span-5" : "lg:col-span-7"}>
          <p className="eyebrow mb-4 flex items-center gap-2 text-gold"><HeartHandshake className="size-4" aria-hidden /> One of our own needs us</p>
          <h2 id="campaign-feature-title" className="text-4xl font-bold leading-[1.06] sm:text-5xl lg:text-6xl">{c.tagline || c.title}</h2>
          {c.summary && <p className="mt-5 max-w-2xl font-serif text-xl leading-relaxed text-paper/85">{c.summary}</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            {c.donateUrl && (
              <a href={c.donateUrl} target="_blank" rel="noopener noreferrer" className="btn bg-gold text-fg hover:bg-paper">
                {c.donateLabel || "Donate now"} <ArrowUpRight className="size-4" aria-hidden />
              </a>
            )}
            <Link href={`/campaigns/${c.slug}`} className="btn-ghost-light">Read the story</Link>
          </div>
        </div>
        <div className={cn("rounded-sm border border-paper/20 p-6 sm:p-8", c.image ? "lg:col-span-3" : "lg:col-span-5")}>
          <CampaignProgress c={c} dark donateUrl={c.donateUrl} />
        </div>
      </div>
    </section>
  );
}
