import { requireArea } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { mediaSrc } from "@/lib/media";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Flash } from "@/components/admin/Flash";
import { saveSettings } from "./actions";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireArea("settings");
  const sp = await searchParams;
  const s = await getSettings();
  const hero = s.heroImageId ? await db.media.findUnique({ where: { id: s.heroImageId } }) : null;
  const logo = s.logoImageId ? await db.media.findUnique({ where: { id: s.logoImageId } }) : null;
  const T = ({ n, l, v, type = "text", help }: { n: string; l: string; v?: string | number | null; type?: string; help?: string }) => (
    <label className="field"><span className="label">{l}</span><input name={n} type={type} defaultValue={v ?? ""} step={type === "number" ? "any" : undefined} className="input" />{help && <span className="text-xs text-stone">{help}</span>}</label>
  );
  const A = ({ n, l, v }: { n: string; l: string; v?: string }) => <label className="field sm:col-span-2"><span className="label">{l}</span><textarea name={n} defaultValue={v} rows={3} className="input" /></label>;
  return (
    <>
      <Flash sp={sp} />
      <p className="eyebrow">System</p>
      <h1 className="mb-8 text-4xl font-bold">Club settings</h1>
      <form action={saveSettings} encType="multipart/form-data" className="grid gap-6">
        <fieldset className="card grid gap-4 p-6 sm:grid-cols-2">
          <legend className="sr-only">Identity</legend><p className="text-xs font-bold uppercase tracking-[0.16em] text-cranberry sm:col-span-2">Identity</p>
          <T n="clubName" l="Club name" v={s.clubName} /><T n="shortName" l="Short name (header)" v={s.shortName} />
          <T n="district" l="District" v={s.district} /><T n="riClubId" l="RI club ID" v={s.riClubId} />
          <T n="charterDate" l="Charter date" type="date" v={s.charterDate} />
          <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="charterVerified" defaultChecked={s.charterVerified} /> Charter date verified</label>
          <div className="field sm:col-span-2">
            <span className="label">Official club logo (optional)</span>
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {logo ? <img src={mediaSrc(logo, "sm")!} alt="" className="h-12 w-auto" /> : <span className="text-sm text-stone">None: a typographic lockup is shown instead.</span>}
              <input type="file" name="logoImage" accept="image/png,image/webp,image/jpeg" className="text-sm" />
              {logo && <label className="text-xs"><input type="checkbox" name="logoRemove" /> Remove</label>}
            </div>
            <span className="text-xs text-stone">Download your club's official Rotaract signature (PNG) from the Rotary Brand Center (brandcenter.rotary.org) and upload it here.</span>
          </div>
          <A n="description" l="Short description (footer, SEO)" v={s.description} /><A n="legalNote" l="Footer note" v={s.legalNote} /><A n="sponsorNote" l="Sponsor / related clubs note" v={s.sponsorNote} />
        </fieldset>
        <fieldset className="card grid gap-4 p-6 sm:grid-cols-2">
          <legend className="sr-only">Homepage</legend><p className="text-xs font-bold uppercase tracking-[0.16em] text-cranberry sm:col-span-2">Homepage hero</p>
          <A n="heroHeadline" l="Headline" v={s.heroHeadline} /><A n="heroSubhead" l="Sub-headline" v={s.heroSubhead} />
          <div className="field sm:col-span-2">
            <span className="label">Hero photograph</span>
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {hero ? <img src={mediaSrc(hero, "sm")!} alt="" className="h-20 w-32 rounded object-cover" /> : <span className="text-sm text-stone">None. The hero shows a typographic design instead.</span>}
              <input type="file" name="heroImage" accept="image/*" className="text-sm" />
              {hero && <label className="text-xs"><input type="checkbox" name="heroRemove" /> Remove</label>}
            </div>
            <input name="heroAlt" placeholder="Describe the photo (alt text)" defaultValue={hero?.alt || ""} className="input mt-2" />
          </div>
          <A n="joinIntro" l="Joining explanation (Get involved)" v={s.joinIntro} /><T n="tagline" l="Tagline" v={s.tagline} />
        </fieldset>
        <fieldset className="card grid gap-4 p-6 sm:grid-cols-2">
          <legend className="sr-only">Meetings</legend><p className="text-xs font-bold uppercase tracking-[0.16em] text-cranberry sm:col-span-2">Weekly meeting</p>
          <T n="meetingDay" l="Day" v={s.meetingDay} help="e.g. Friday" /><T n="meetingTime" l="Time" v={s.meetingTime} help="e.g. 6:00 PM" />
          <T n="meetingVenue" l="Venue" v={s.meetingVenue} /><T n="meetingAddress" l="Address" v={s.meetingAddress} />
          <T n="meetingLat" l="Map latitude" type="number" v={s.meetingLat} /><T n="meetingLng" l="Map longitude" type="number" v={s.meetingLng} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="meetingVerified" defaultChecked={s.meetingVerified} /> Meeting details verified</label>
        </fieldset>
        <fieldset className="card grid gap-4 p-6 sm:grid-cols-2">
          <legend className="sr-only">Contact</legend><p className="text-xs font-bold uppercase tracking-[0.16em] text-cranberry sm:col-span-2">Contact & social</p>
          <T n="email" l="Public email" v={s.email} type="email" /><T n="phone" l="Public phone" v={s.phone} />
          <T n="x" l="X" v={s.socials.x} type="url" /><T n="instagram" l="Instagram" v={s.socials.instagram} type="url" />
          <T n="facebook" l="Facebook" v={s.socials.facebook} type="url" /><T n="linkedin" l="LinkedIn" v={s.socials.linkedin} type="url" />
          <T n="youtube" l="YouTube" v={s.socials.youtube} type="url" /><T n="tiktok" l="TikTok" v={s.socials.tiktok} type="url" />
        </fieldset>
        <fieldset className="card grid gap-4 p-6 sm:grid-cols-2">
          <legend className="sr-only">Attendance</legend><p className="text-xs font-bold uppercase tracking-[0.16em] text-cranberry sm:col-span-2">Attendance</p>
          <T n="attendanceFollowUpThreshold" l="Follow-up threshold (%)" type="number" v={s.attendanceFollowUpThreshold} help="Members below this rate are flagged for follow-up." />
        </fieldset>
        <div className="sticky bottom-0 border-t border-line bg-paper-2/95 py-4"><SubmitButton>Save settings</SubmitButton></div>
      </form>
    </>
  );
}
