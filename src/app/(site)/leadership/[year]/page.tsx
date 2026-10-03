import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHero } from "@/components/site/Section";
import { LeadershipView } from "@/components/site/LeadershipView";

export async function generateMetadata({ params }: { params: Promise<{ year: string }> }): Promise<Metadata> {
  const { year } = await params;
  const y = await db.rotaractYear.findUnique({ where: { slug: year } });
  return y ? { title: `Leadership ${y.label}`, description: `The board and committee chairs of Rotaract Club Kampala North in ${y.label}.`, alternates: { canonical: `/leadership/${y.slug}` } } : {};
}

export default async function LeadershipYearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const y = await db.rotaractYear.findUnique({ where: { slug: year } });
  if (!y) notFound();
  return (
    <>
      <PageHero eyebrow="Our leaders through the years" title={<>Leadership,<br />{y.label}.</>} />
      <LeadershipView year={y} />
    </>
  );
}
