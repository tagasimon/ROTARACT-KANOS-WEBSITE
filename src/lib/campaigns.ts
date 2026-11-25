import { db } from "@/lib/db";

/** Campaigns a visitor may see. Archived, draft and rejected ones are hidden everywhere. */
export const publicCampaign = { publishStatus: "PUBLISHED" as const };

export function getFeaturedCampaign() {
  return db.campaign.findFirst({
    where: { ...publicCampaign, featured: true, status: { not: "CLOSED" } },
    include: { image: true },
    orderBy: { updatedAt: "desc" },
  });
}

/** `preview`: also return an unpublished campaign (for admins checking a draft). */
export function getCampaign(slug: string, preview = false) {
  return db.campaign.findFirst({
    where: { slug, ...(preview ? {} : publicCampaign) },
    include: { image: true, updates: { where: { published: true }, orderBy: { date: "desc" } } },
  });
}

/** "UGX 200,000,000". No decimals: these are whole-currency fundraising totals. */
export function fmtMoney(amount: number, currency = "UGX") {
  return `${currency} ${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(Math.round(amount))}`;
}

/** "UGX 200 million" for headlines; falls back to the full figure below a million. */
export function fmtMoneyShort(amount: number, currency = "UGX") {
  const trim = (n: number) => String(Math.round(n * 10) / 10).replace(/\.0$/, "");
  if (amount >= 1e9) return `${currency} ${trim(amount / 1e9)} billion`;
  if (amount >= 1e6) return `${currency} ${trim(amount / 1e6)} million`;
  return fmtMoney(amount, currency);
}

export type CampaignMoney = { goalAmount: number | null; raisedAmount: number | null; currency: string; raisedAsOf: Date | null };

/** Everything the progress display needs, worked out in one place. */
export function campaignProgress(c: CampaignMoney) {
  const goal = c.goalAmount && c.goalAmount > 0 ? c.goalAmount : null;
  const raised = c.raisedAmount != null && c.raisedAmount >= 0 ? c.raisedAmount : null;
  const percent = goal != null && raised != null ? Math.min(100, Math.round((raised / goal) * 100)) : null;
  const remaining = goal != null && raised != null ? Math.max(0, goal - raised) : null;
  return { goal, raised, percent, remaining };
}

export function hostOf(url?: string | null) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
