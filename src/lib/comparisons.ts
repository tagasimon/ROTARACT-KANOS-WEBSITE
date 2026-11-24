import { db } from "@/lib/db";
import { mediaSrc, mediaSrcSet } from "@/lib/media";
import { fmtDate } from "@/lib/utils";

type M = Parameters<typeof mediaSrc>[0];
export type CompareStage = { label: string; src: string; srcSet?: string; date?: string };
export type Comparison = { id: string; title?: string | null; caption?: string | null; sourceUrl?: string | null; stages: CompareStage[]; mediaIds: string[] };

const shortDate = (d?: Date | null) => (d ? fmtDate(d, { month: "short", year: "numeric" }) : undefined);

function stage(m: (NonNullable<M> & { date?: Date | null }) | null, label: string, date?: Date | null): CompareStage | null {
  if (!m) return null;
  const src = mediaSrc(m, "lg");
  return src ? { label, src, srcSet: mediaSrcSet(m) || undefined, date: shortDate(date ?? m?.date) } : null;
}

/**
 * The before/after comparisons for a project, in display order.
 * Uses the comparisons an admin has set up. If there are none, falls back to the
 * project's photos tagged with a Then → Now phase, so older projects keep their slider.
 */
export async function getComparisons(projectId: string): Promise<Comparison[]> {
  const rows = await db.projectComparison.findMany({
    where: { projectId, published: true },
    include: { before: true, during: true, after: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const out: Comparison[] = [];
  for (const r of rows) {
    const stages = [stage(r.before, r.beforeLabel, r.beforeDate), stage(r.during, r.duringLabel, r.duringDate), stage(r.after, r.afterLabel, r.afterDate)].filter((x): x is CompareStage => !!x);
    if (stages.length >= 2) out.push({ id: r.id, title: r.title, caption: r.caption, stages, mediaIds: [r.beforeId, r.duringId, r.afterId].filter((x): x is string => !!x) });
  }
  if (out.length) return out;

  const media = await db.media.findMany({ where: { projectId, phase: { not: null } }, orderBy: [{ date: "desc" }, { sortOrder: "asc" }] });
  const befores = media.filter((m) => m.phase === "BEFORE");
  const afters = media.filter((m) => m.phase === "AFTER" || m.phase === "CURRENT");
  // Prefer a pair from the same post: same building, same angle.
  let before = befores[befores.length - 1];
  let after = afters[0];
  for (const b of befores) {
    const a = afters.find((x) => x.sourceUrl && x.sourceUrl === b.sourceUrl);
    if (a) {
      before = b;
      after = a;
      break;
    }
  }
  if (!before || !after) return [];
  const stages = [stage(before, "Before"), stage(after, after.phase === "CURRENT" ? "Now" : "After")].filter((x): x is CompareStage => !!x);
  return stages.length === 2 ? [{ id: `phase-${before.id}`, caption: after.caption || before.caption, sourceUrl: after.sourceUrl, stages, mediaIds: [before.id, after.id] }] : [];
}
