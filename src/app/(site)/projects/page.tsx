import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma, ProjectStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { publicProject } from "@/lib/queries";
import { PageHero, Empty } from "@/components/site/Section";
import { ProjectCard } from "@/components/site/Cards";
import { cn, humanize } from "@/lib/utils";
import { FOCUS_AREAS } from "@/lib/admin/resources";

export const metadata: Metadata = {
  title: "Projects",
  description: "Every service project by Rotaract Club Kampala North, told from the first need to its impact today.",
  alternates: { canonical: "/projects" },
};

const FILTERS: { key: string; label: string; statuses?: ProjectStatus[] }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "In progress", statuses: ["IDEA", "PLANNING", "FUNDRAISING", "IMPLEMENTATION", "ONGOING"] },
  { key: "completed", label: "Completed", statuses: ["COMPLETED"] },
];

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ status?: string; year?: string; committee?: string; focus?: string }> }) {
  const sp = await searchParams;
  const f = FILTERS.find((x) => x.key === sp.status) || FILTERS[0];
  const where: Prisma.ProjectWhereInput = { ...publicProject };
  if (f.statuses) where.status = { in: f.statuses };
  if (sp.year) where.year = { slug: sp.year };
  if (sp.committee) where.committee = { slug: sp.committee };
  if (sp.focus) where.focusAreas = { has: sp.focus };
  const [projects, years] = await Promise.all([
    db.project.findMany({ where, include: { cover: true, year: true }, orderBy: [{ featured: "desc" }, { startDate: "desc" }] }),
    db.rotaractYear.findMany({ where: { projects: { some: publicProject } }, orderBy: { startDate: "desc" } }),
  ]);
  const [lead, ...rest] = projects;
  const qs = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ status: sp.status, year: sp.year, focus: sp.focus, ...o }).filter(([, v]) => v) as [string, string][]);
    return p.toString() ? `?${p}` : "";
  };
  return (
    <>
      <PageHero eyebrow="Projects" title={<>Service, from the first<br />need to impact today.</>} intro="Each project is told as a journey: the need, the idea, the people, the partners, the milestones and what changed.">
        <Link href="/support" className="btn bg-gold text-fg hover:bg-paper">Support a project</Link>
      </PageHero>
      <section className="container-x py-14 sm:py-20">
        <nav aria-label="Filter projects" className="mb-12 flex flex-wrap items-center gap-2">
          {FILTERS.map((x) => (
            <Link key={x.key} href={`/projects${qs({ status: x.key === "all" ? undefined : x.key })}`} className={cn("rounded-full border px-4 py-2 text-sm font-semibold", f.key === x.key ? "border-royal bg-royal text-paper" : "border-fg/20 hover:border-royal")} aria-current={f.key === x.key ? "page" : undefined}>
              {x.label}
            </Link>
          ))}
          <span className="mx-2 h-6 w-px bg-line" aria-hidden />
          {years.map((y) => (
            <Link key={y.slug} href={`/projects${qs({ year: sp.year === y.slug ? undefined : y.slug })}`} className={cn("rounded-full border px-3 py-1.5 font-cond text-xs", sp.year === y.slug ? "border-cranberry bg-cranberry text-paper" : "border-fg/15 text-stone hover:border-royal")}>
              {y.label}
            </Link>
          ))}
        </nav>
        <nav aria-label="Filter by Rotary area of focus" className="-mt-8 mb-12 flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-1">Area of focus</span>
          {FOCUS_AREAS.map((a) => (
            <Link key={a} href={`/projects${qs({ focus: sp.focus === a ? undefined : a })}`} className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", sp.focus === a ? "border-gold bg-gold text-fg" : "border-fg/15 text-stone hover:border-royal")} aria-current={sp.focus === a ? "true" : undefined}>
              {a}
            </Link>
          ))}
        </nav>
        {projects.length === 0 ? (
          <Empty title="No projects match">Try another filter.</Empty>
        ) : (
          <>
            {lead && <ProjectCard p={lead} large className="mb-16" />}
            <div className="grid gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((p) => <ProjectCard key={p.slug} p={p} />)}
            </div>
          </>
        )}
        <p className="mt-16 text-sm text-stone">Statuses: {(["IDEA", "PLANNING", "FUNDRAISING", "IMPLEMENTATION", "ONGOING", "COMPLETED"] as const).map(humanize).join(" → ")}</p>
      </section>
    </>
  );
}
