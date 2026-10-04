import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { Wordmark } from "./Header";

export async function SiteFooter() {
  const s = await getSettings();
  const socials = Object.entries(s.socials).filter(([, v]) => v);
  const label: Record<string, string> = { x: "X", instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn", youtube: "YouTube", tiktok: "TikTok" };
  return (
    <footer className="grain bg-royal text-paper">
      <div className="container-x grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <Wordmark name={s.shortName} light />
          <p className="mt-6 max-w-sm font-serif text-lg text-paper/70">{s.description}</p>
          <p className="mt-6 text-sm text-paper/50">{s.legalNote}</p>
        </div>
        <div className="md:col-span-3">
          <p className="eyebrow mb-4 text-paper/50">We meet</p>
          <p className="font-display text-2xl font-bold">{s.meetingDay}s, {s.meetingTime}</p>
          <p className="mt-1 text-paper/70">{s.meetingVenue}<br />{s.meetingAddress}</p>
          <Link href="/events" className="mt-4 inline-block text-sm font-semibold text-gold hover:underline">See upcoming meetings →</Link>
        </div>
        <div className="grid grid-cols-2 gap-8 md:col-span-4">
          <div>
            <p className="eyebrow mb-4 text-paper/50">Explore</p>
            <ul className="space-y-2 text-sm text-paper/80">
              {[["/support", "Support our work"], ["/about", "Our story"], ["/projects", "Projects"], ["/leadership/past-presidents", "Past presidents"], ["/people", "People"], ["/skills", "Skills directory"], ["/achievements", "Achievements"], ["/memories", "Memories"], ["/years", "Year archive"]].map(([h, l]) => (
                <li key={h}><Link href={h} className="hover:text-paper hover:underline">{l}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-4 text-paper/50">Follow</p>
            <ul className="space-y-2 text-sm text-paper/80">
              {socials.map(([k, v]) => (
                <li key={k}><a href={v} target="_blank" rel="noopener noreferrer" className="hover:text-paper hover:underline">{label[k]}</a></li>
              ))}
              {s.email && <li><a href={`mailto:${s.email}`} className="hover:text-paper hover:underline">{s.email}</a></li>}
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-paper/10">
        <div className="container-x flex flex-col gap-2 py-6 text-xs text-paper/45 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {s.clubName}. Rotaract is a program of Rotary International; this is an independent club website.</p>
          <p className="flex gap-4"><Link href="/check-in" className="hover:text-paper">Attendance check-in</Link><Link href="/login" className="hover:text-paper">Member sign in</Link></p>
        </div>
      </div>
    </footer>
  );
}
