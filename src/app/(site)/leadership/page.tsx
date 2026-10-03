import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentYear } from "@/lib/years";
import { PageHero, Empty } from "@/components/site/Section";
import { LeadershipView } from "@/components/site/LeadershipView";

export const metadata: Metadata = { title: "Club Leadership", description: "The current board and committee chairs of Rotaract Club Kampala North.", alternates: { canonical: "/leadership" } };

export default async function LeadershipPage() {
  const year = await getCurrentYear();
  return (
    <>
      <PageHero eyebrow="Club leadership" title={<>The team<br />leading the work.</>} intro={<>Every Rotaract year brings a new board. Browse the current team, look back through our <Link href="/leadership/past-presidents" className="underline underline-offset-4">past presidents</Link>, or pick any year below.</>} />
      {year ? <LeadershipView year={year} /> : <div className="container-x py-16"><Empty title="No current Rotaract year set" /></div>}
    </>
  );
}
