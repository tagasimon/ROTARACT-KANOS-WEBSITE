import { requireArea } from "@/lib/auth";
import { relationOptions } from "@/lib/admin/crud";
import { getResource } from "@/lib/admin/resources";
import { E } from "@/lib/admin/resources";
import { humanize } from "@/lib/utils";
import { MultiPicker } from "@/components/admin/MultiPicker";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Flash } from "@/components/admin/Flash";
import { importPost } from "./actions";

export const metadata = { title: "Import post" };

export default async function ImportPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireArea("content");
  const sp = await searchParams;
  const r = getResource("social")!;
  const f = (n: string) => r.fields.find((x) => x.name === n)!;
  const [orgs, projects, events, people, years] = await Promise.all([relationOptions(f("organizationId")), relationOptions(f("projectId")), relationOptions(f("eventId")), relationOptions(f("people")), relationOptions(f("yearId"))]);
  return (
    <>
      <Flash sp={sp} />
      <p className="eyebrow">Social → archive</p>
      <h1 className="text-4xl font-bold">Import post</h1>
      <p className="mb-8 mt-2 max-w-2xl text-sm text-stone">Paste a post from X, Instagram, Facebook or LinkedIn. We don't scrape those sites, so copy the text and save the image yourself. Afterwards you can turn the post into a story, a milestone, an achievement, an event, an album or a member spotlight.</p>
      <form action={importPost} encType="multipart/form-data" className="card grid gap-5 p-6">
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="field sm:col-span-2"><label className="label" htmlFor="url">Original URL *</label><input id="url" name="url" type="url" required className="input" placeholder="https://www.instagram.com/p/…" /></div>
          <div className="field"><label className="label" htmlFor="platform">Platform</label><select id="platform" name="platform" className="input"><option value="">Detect from URL</option>{E.platform.map((p) => <option key={p} value={p}>{humanize(p)}</option>)}</select></div>
        </div>
        <div className="field"><label className="label" htmlFor="content">Post text</label><textarea id="content" name="content" rows={5} className="input" /></div>
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="field"><label className="label" htmlFor="postedAt">Posted</label><input id="postedAt" name="postedAt" type="datetime-local" className="input" /></div>
          <div className="field"><label className="label" htmlFor="category">Category</label><select id="category" name="category" className="input">{E.category.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}</select></div>
          <div className="field"><label className="label" htmlFor="organizationId">Whose post</label><select id="organizationId" name="organizationId" className="input"><option value="">This club</option>{orgs.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="field"><label className="label" htmlFor="imageId__file">Image (upload)</label><input id="imageId__file" name="imageId__file" type="file" accept="image/*" className="text-sm" /></div>
          <div className="field"><label className="label" htmlFor="imageUrl">…or image URL</label><input id="imageUrl" name="imageUrl" type="url" className="input" /></div>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="field"><label className="label" htmlFor="projectId">Project</label><select id="projectId" name="projectId" className="input"><option value="">—</option>{projects.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></div>
          <div className="field"><label className="label" htmlFor="eventId">Event</label><select id="eventId" name="eventId" className="input"><option value="">—</option>{events.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></div>
          <div className="field"><label className="label" htmlFor="yearId">Rotaract year</label><select id="yearId" name="yearId" className="input"><option value="">Auto from date</option>{years.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></div>
        </div>
        <div className="field"><span className="label">People in the post</span><MultiPicker name="people" options={people} selected={[]} label="People" /></div>
        <label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" name="publishNow" className="size-5" /> Publish to the feed now (otherwise it goes to Needs review)</label>
        <input type="hidden" name="showInFeed" value="on" />
        <SubmitButton className="btn-primary justify-self-start" pendingText="Importing…">Import post</SubmitButton>
      </form>
    </>
  );
}
