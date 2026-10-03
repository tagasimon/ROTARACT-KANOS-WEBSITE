import Link from "next/link";
import { db } from "@/lib/db";
import { getLeadershipForYear } from "@/lib/queries";
import { PersonCard } from "./Cards";
import { Img, Monogram } from "./Img";
import { Empty } from "./Section";
import { SourceNote, VerificationBadge } from "./Badges";
import { cn, initials } from "@/lib/utils";
import type { RotaractYear } from "@prisma/client";

export async function LeadershipView({ year }: { year: RotaractYear }) {
  const [club, district, years] = await Promise.all([
    getLeadershipForYear(year.id, "club"),
    getLeadershipForYear(year.id, "district"),
    db.rotaractYear.findMany({ orderBy: { startDate: "desc" }, select: { slug: true, label: true, _count: { select: { leadership: true } } } }),
  ]);
  const president = club.find((l) => l.role.slug === "president");
  const board = club.filter((l) => l !== president && l.role.category === "BOARD");
  const chairs = club.filter((l) => l.role.category === "COMMITTEE_CHAIR");
  const other = club.filter((l) => l.role.category === "OTHER");
  const fromClub = district.filter((d) => d.person.type === "MEMBER" && !["district-governor", "district-rotaract-representative", "assistant-district-rotaract-representative"].includes(d.role.slug));
  const districtLeads = district.filter((d) => ["district-governor", "district-rotaract-representative", "assistant-district-rotaract-representative"].includes(d.role.slug));

  return (
    <>
      <nav aria-label="Rotaract years" className="border-b border-line bg-paper-2">
        <div className="container-x flex gap-1 overflow-x-auto py-3 scrollbar-none">
          {years.map((y) => (
            <Link key={y.slug} href={`/leadership/${y.slug}`} aria-current={y.slug === year.slug ? "page" : undefined} className={cn("shrink-0 rounded-full px-3.5 py-1.5 font-cond text-sm", y.slug === year.slug ? "bg-royal text-paper" : y._count.leadership ? "text-fg hover:bg-royal/5" : "text-stone-2 hover:bg-royal/5")}>
              {y.label}
            </Link>
          ))}
        </div>
      </nav>

      <section className="container-x py-16 sm:py-20">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow mb-3">Club leadership</p>
            <h2 className="font-display text-[clamp(3rem,9vw,8rem)] font-bold leading-none tracking-tight">{year.label}</h2>
            {year.theme && <p className="mt-4 font-serif text-2xl italic text-stone">“{year.theme}”</p>}
            {year.summary && <p className="mt-2 max-w-2xl text-stone">{year.summary}</p>}
          </div>
          <Link href={`/years/${year.slug}`} className="btn-ghost">The year that was →</Link>
        </div>

        {president ? (
          <div className="mb-16 grid gap-8 rounded-sm bg-royal p-6 text-paper sm:p-10 md:grid-cols-12">
            <Link href={`/people/${president.person.slug}`} className="block md:col-span-4">
              <div className="aspect-[4/5] overflow-hidden rounded-sm">
                <Img media={president.person.photo} alt={president.person.name} sizes="30vw" size="md" className="size-full" fallback={<Monogram text={initials(president.person.name)} dark className="size-full" />} />
              </div>
            </Link>
            <div className="flex flex-col justify-end md:col-span-8">
              <p className="eyebrow text-gold">President</p>
              <Link href={`/people/${president.person.slug}`} className="mt-2 font-display text-5xl font-bold leading-none hover:text-gold sm:text-6xl">{president.person.name}</Link>
              {(president.person.professionalTitle || president.person.organization) && <p className="mt-3 font-serif text-xl text-paper/70">{[president.person.professionalTitle, president.person.organization].filter(Boolean).join(", ")}</p>}
              {president.highlights && <p className="mt-6 max-w-2xl text-paper/75">{president.highlights}</p>}
              <div className="mt-6 flex flex-wrap items-center gap-3"><VerificationBadge v={president.verification} dark /><SourceNote source={president.source} url={president.sourceUrl} className="text-paper/50" /></div>
            </div>
          </div>
        ) : (
          <Empty title={`No president recorded for ${year.label}`}>If you know who led the club this year, an admin can add them under Leadership in the CMS.</Empty>
        )}

        {[["Board", board], ["Directors & committee chairs", chairs], ["Other roles", other]].map(([title, list]) =>
          (list as typeof club).length ? (
            <div key={title as string} className="mb-16">
              <h3 className="mb-8 border-b border-line pb-3 text-2xl font-bold">{title as string}</h3>
              <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
                {(list as typeof club).map((l) => <PersonCard key={l.id} p={l.person} role={l.customTitle || l.role.title} />)}
              </div>
            </div>
          ) : null,
        )}

        {fromClub.length > 0 && (
          <div className="mb-16">
            <h3 className="mb-2 border-b border-line pb-3 text-2xl font-bold">Kampala North on the district team</h3>
            <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
              {fromClub.map((l) => <PersonCard key={l.id} p={l.person} role={l.customTitle || l.role.title} />)}
            </div>
          </div>
        )}

        {districtLeads.length > 0 && (
          <div className="rounded-sm border border-line bg-paper-2 p-6">
            <p className="eyebrow mb-4">District leadership, {year.label}</p>
            <ul className="grid gap-4 sm:grid-cols-3">
              {districtLeads.map((l) => (
                <li key={l.id}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone">{l.customTitle || l.role.title}</p>
                  <Link href={`/people/${l.person.slug}`} className="font-display text-lg font-bold hover:text-cranberry">{l.person.name}</Link>
                  {l.person.organization && <p className="text-sm text-stone">{l.person.organization}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </>
  );
}
