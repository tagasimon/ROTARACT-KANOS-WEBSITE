import Link from "next/link";
import { Download, Printer } from "lucide-react";
import { requireArea } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { emailOffReason } from "@/lib/meeting/email";
import { MEETING } from "@/lib/meeting/config";
import { guestsByClub, meetingsWithCounts, memberRates, rotaryYearStart } from "@/lib/meeting/stats";
import { clockTime, localParts } from "@/lib/meeting/today";
import { qrSvg, signInUrl } from "@/lib/qr";
import { cn, fmtDate } from "@/lib/utils";
import { Flash } from "@/components/admin/Flash";
import { CopyLink } from "./Bits";

export const metadata = { title: "Meeting sign-in" };

const day = (d: Date) => fmtDate(d, { weekday: "short", day: "numeric", month: "short", year: "numeric" });

function Chart({ data }: { data: { label: string; members: number; guests: number }[] }) {
  if (!data.length) return null;
  const W = 720, H = 200, pad = 28, max = Math.max(1, ...data.map((d) => d.members + d.guests));
  const bw = (W - pad * 2) / data.length;
  const y = (v: number) => ((H - 40) * v) / max;
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Members and guests at the last meetings" className="h-auto w-full">
        {data.map((d, i) => {
          const x = pad + i * bw + bw * 0.18, w = bw * 0.64, hm = y(d.members), hg = y(d.guests), base = H - 24;
          return (
            <g key={i}>
              <rect x={x} y={base - hm} width={w} height={hm} fill="#17458F"><title>{`${d.label}: ${d.members} members`}</title></rect>
              <rect x={x} y={base - hm - hg} width={w} height={hg} fill="#F7A81B"><title>{`${d.label}: ${d.guests} guests`}</title></rect>
              <text x={x + w / 2} y={base - hm - hg - 4} textAnchor="middle" fontSize="11" fill="#54565A">{d.members + d.guests}</text>
              <text x={x + w / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#54565A">{d.label}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 flex gap-4 text-xs text-stone">
        <span className="flex items-center gap-1.5"><span className="size-3 bg-royal" aria-hidden /> Members</span>
        <span className="flex items-center gap-1.5"><span className="size-3 bg-gold" aria-hidden /> Guests</span>
      </figcaption>
    </figure>
  );
}

export default async function AttendanceOverview({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireArea("attendance");
  const sp = await searchParams;
  const scope = sp.clubs === "all" ? "all" : "year";
  const [meetings, clubs, rates, svg, s] = await Promise.all([meetingsWithCounts({ take: 200 }), guestsByClub(scope), memberRates(), qrSvg(), getSettings()]);
  const off = emailOffReason();
  const last = meetings[0];
  const recent = meetings.slice(0, 8);
  const avg = recent.length ? Math.round(recent.reduce((a, m) => a + m.counts.total, 0) / recent.length) : null;
  const chart = meetings.slice(0, 12).reverse().map((m) => ({ label: m.day.toISOString().slice(5, 10).split("-").reverse().join("/"), members: m.counts.members, guests: m.counts.guests }));
  const url = signInUrl();
  const weeklyThisYear = meetings.filter((m) => m.type === "WEEKLY" && m.date >= rotaryYearStart()).length;
  const threshold = s.attendanceFollowUpThreshold || 50;

  return (
    <>
      <Flash sp={sp} />
      <p className="eyebrow">Attendance</p>
      <h1 className="text-4xl font-bold">Meeting sign-in</h1>
      <p className="mb-8 mt-2 max-w-2xl text-sm text-stone">One permanent QR code. Members and visitors scan it and fill in a short form: no account needed. The first sign-in of the day creates that day&rsquo;s meeting.</p>

      <section className="card mb-6 grid gap-6 p-5 md:grid-cols-[13rem_1fr] md:items-center">
        <div className="mx-auto w-48 md:w-full [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} aria-label="QR code for meeting sign-in" role="img" />
        <div>
          <p className="label">Sign-in address</p>
          <p className="mt-1 break-all font-mono text-lg font-semibold">{url}</p>
          <p className="mt-1 text-sm text-stone">This address never changes, so printed codes keep working.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="/attend/poster" target="_blank" className="btn-ink btn-sm"><Printer className="size-4" aria-hidden /> Print poster / show on screen</a>
            <a href="/admin/attendance/qr/svg" className="btn-ghost btn-sm bg-white"><Download className="size-4" aria-hidden /> QR (SVG)</a>
            <a href="/admin/attendance/qr/png" className="btn-ghost btn-sm bg-white"><Download className="size-4" aria-hidden /> QR (PNG)</a>
            <CopyLink url={url} />
          </div>
        </div>
      </section>

      <p role="status" className={cn("mb-6 rounded-md border px-4 py-3 text-sm", off ? "border-gold/60 bg-gold/15" : "border-grass/30 bg-grass/10")}>
        {off ? (
          <><strong>Thank-you emails are off</strong> ({off}). Sign-ins still work; people just don&rsquo;t get an email, and their row shows &ldquo;Not sent&rdquo;.</>
        ) : (
          <><strong>Thank-you emails are on.</strong> Sent from {process.env.EMAIL_FROM} with replies going to {MEETING.CLUB_EMAIL}. Visiting Rotarians and Rotaractors get their make-up card attached.</>
        )}
      </p>

      <section aria-label="At a glance" className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ["Last meeting", last ? last.counts.total : "—", last ? day(last.date) : "No meetings yet"],
          ["Members", last ? last.counts.members : "—", "at the last meeting"],
          ["Guests", last ? last.counts.guests : "—", "at the last meeting"],
          ["Average", avg ?? "—", `per meeting, last ${recent.length || 8}`],
        ].map(([l, v, sub]) => (
          <div key={String(l)} className="card p-5">
            <p className="label">{l}</p>
            <p className="mt-2 font-display text-4xl font-bold tabular-nums">{v}</p>
            <p className="mt-1 text-xs text-stone">{sub}</p>
          </div>
        ))}
      </section>

      {chart.length > 0 && (
        <section className="card mb-6 p-5">
          <h2 className="label mb-3">Members and guests, last {chart.length} meetings</h2>
          <Chart data={chart} />
        </section>
      )}

      <section className="card mb-6 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="label">Guests by club</h2>
          <nav aria-label="Period" className="flex gap-1 text-sm">
            <Link href="/admin/attendance" className={cn("rounded-full px-3 py-1 font-semibold", scope === "year" ? "bg-royal text-paper" : "hover:bg-paper-2")}>This Rotary year</Link>
            <Link href="/admin/attendance?clubs=all" className={cn("rounded-full px-3 py-1 font-semibold", scope === "all" ? "bg-royal text-paper" : "hover:bg-paper-2")}>All time</Link>
          </nav>
        </div>
        {clubs.length ? (
          <div className="overflow-x-auto">
            <table className="table-x">
              <thead><tr><th>Club</th><th>Type</th><th>Visits</th><th>People</th><th>Last visit</th></tr></thead>
              <tbody>{clubs.map((c) => <tr key={c.club}><td className="font-semibold">{c.club}{c.district && <span className="block text-xs font-normal text-stone">District {c.district}</span>}</td><td>{c.type === "ROTARY" ? "Rotary" : "Rotaract"}</td><td className="tabular-nums">{c.visits}</td><td className="tabular-nums">{c.people}</td><td className="whitespace-nowrap text-stone">{day(c.lastVisit)}</td></tr>)}</tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-stone">No visiting Rotarians or Rotaractors {scope === "year" ? "this Rotary year" : "yet"}. Prospects aren&rsquo;t counted here.</p>
        )}
      </section>

      {weeklyThisYear > 0 && rates.length > 0 && (
        <section className="card mb-6 p-5">
          <h2 className="label mb-1">Members&rsquo; attendance this Rotary year</h2>
          <p className="mb-3 text-xs text-stone">Weekly meetings attended out of those held since 1 July (or since the member joined). Below {threshold}% is highlighted. Only members whose sign-in matched their email or phone are counted.</p>
          <div className="max-h-96 overflow-auto">
            <table className="table-x">
              <thead className="sticky top-0 bg-white"><tr><th>Member</th><th>Attended</th><th>Rate</th><th>Last attended</th></tr></thead>
              <tbody>
                {rates.map((r) => (
                  <tr key={r.id} className={cn(r.rate != null && r.rate < threshold && "bg-gold/10")}>
                    <td><Link href={`/admin/c/members/${r.id}`} className="font-semibold hover:text-cranberry">{r.name}</Link><span className="block font-cond text-xs text-stone">{r.memberNumber}</span></td>
                    <td className="tabular-nums">{r.attended} of {r.expected}</td>
                    <td className="tabular-nums font-semibold">{r.rate == null ? "—" : `${r.rate}%`}</td>
                    <td className="text-stone">{r.last ? day(r.last) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="label">Meetings</h2>
          {meetings.length > 0 && <a href="/admin/attendance/export" className="btn-ghost btn-sm bg-white"><Download className="size-4" aria-hidden /> Download all (CSV)</a>}
        </div>
        {meetings.length ? (
          <div className="overflow-x-auto">
            <table className="table-x">
              <thead><tr><th>Date</th><th>Meeting</th><th>Members</th><th>Guests</th><th>Rotarians</th><th>Rotaractors</th><th>Prospects</th><th>Clubs</th><th>Total</th></tr></thead>
              <tbody>
                {meetings.map((m) => (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap">{day(m.date)}</td>
                    <td><Link href={`/admin/attendance/${m.id}`} className="font-semibold hover:text-cranberry">{m.title}</Link>{m.type !== "GATHERING" && <span className="block text-xs text-stone">{clockTime(m.date)}{localParts(m.date).iso === localParts().iso && " · today"}</span>}</td>
                    {[m.counts.members, m.counts.guests, m.counts.rotarians, m.counts.rotaractors, m.counts.prospects, m.counts.clubs].map((v, i) => <td key={i} className="tabular-nums">{v}</td>)}
                    <td className="font-semibold tabular-nums">{m.counts.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-stone">No meetings yet. The first person to scan the code on a meeting day creates the meeting.</p>
        )}
      </section>
    </>
  );
}
