import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { nextRegularMeeting, publicProject } from "@/lib/queries";
import { PageHero } from "@/components/site/Section";
import { InquiryForm } from "./InquiryForm";
import { fmtDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Get Involved", description: "Attend a meeting, volunteer, partner with us, support a project or express interest in joining Rotaract Club Kampala North.", alternates: { canonical: "/get-involved" } };

export default async function GetInvolvedPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const [s, projects] = await Promise.all([getSettings(), db.project.findMany({ where: { ...publicProject, status: { not: "COMPLETED" } }, select: { id: true, title: true }, orderBy: { title: "asc" } })]);
  const next = nextRegularMeeting(s.meetingDay, s.meetingTime);
  const ways = [
    ["Attend an event", "Come to a Friday fellowship as a guest. No commitment, just good company and a chance to see what we do."],
    ["Volunteer", "Lend a hand on a service day. You don't need to be a member to show up and help."],
    ["Partner with us", "Companies, NGOs, schools and community leaders: let's design service projects that last."],
    ["Support a project", "Fund, donate supplies or share expertise for a specific project."],
    ["Express interest in joining", s.joinIntro],
  ];
  return (
    <>
      <PageHero eyebrow="Get involved" title={<>There's a seat<br />for you on Friday.</>} intro={next ? <>Our next regular fellowship is on {fmtDate(next, { weekday: "long", day: "numeric", month: "long" })} at {s.meetingTime}, {s.meetingVenue}, {s.meetingAddress}.</> : undefined} />
      <section className="container-x grid gap-16 py-16 lg:grid-cols-12">
        <ol className="space-y-8 lg:col-span-5">
          {ways.map(([t, d], i) => (
            <li key={t} className="grid grid-cols-[2.5rem_1fr] gap-3">
              <span className="font-cond text-sm font-semibold text-cranberry">{String(i + 1).padStart(2, "0")}</span>
              <div><h2 className="text-2xl font-bold">{t}</h2><p className="mt-1 font-serif text-lg text-stone">{d}</p></div>
            </li>
          ))}
        </ol>
        <div className="lg:col-span-7">
          <div className="rounded-sm bg-paper-2 p-6 sm:p-10">
            <h2 className="mb-6 text-3xl font-bold">Tell us how you'd like to help</h2>
            <InquiryForm defaultType={type} projects={projects} />
          </div>
        </div>
      </section>
    </>
  );
}
