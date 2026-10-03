import { requireArea } from "@/lib/auth";
import { relationOptions } from "@/lib/admin/crud";
import { getResource, E } from "@/lib/admin/resources";
import { humanize } from "@/lib/utils";
import { MultiPicker } from "@/components/admin/MultiPicker";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Flash } from "@/components/admin/Flash";
import { uploadPhotos } from "./actions";

export const metadata = { title: "Upload photos" };

export default async function UploadPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireArea("content");
  const sp = await searchParams;
  const r = getResource("photos")!;
  const f = (n: string) => r.fields.find((x) => x.name === n)!;
  const [albums, projects, events, people, years] = await Promise.all([relationOptions(f("albumId")), relationOptions(f("projectId")), relationOptions(f("eventId")), relationOptions(f("people")), relationOptions(f("yearId"))]);
  const Sel = ({ name, label, options }: { name: string; label: string; options: { id: string; label: string }[] }) => (
    <div className="field"><label className="label" htmlFor={name}>{label}</label><select id={name} name={name} defaultValue={sp[name] || ""} className="input"><option value="">—</option>{options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></div>
  );
  return (
    <>
      <Flash sp={sp} />
      <p className="eyebrow">Media</p>
      <h1 className="mb-2 text-4xl font-bold">Upload photos</h1>
      <p className="mb-8 max-w-2xl text-sm text-stone">Select many photos at once. Each one is resized into four WebP sizes (480–2400px) so pages stay fast on mobile data. The details below apply to every photo in this batch, and you can edit any photo individually afterwards.</p>
      <form action={uploadPhotos} encType="multipart/form-data" className="card grid gap-5 p-6">
        <div className="field"><label className="label" htmlFor="files">Photos *</label><input id="files" name="files" type="file" accept="image/*" multiple required className="rounded-md border-2 border-dashed border-fg/20 bg-paper p-6 text-sm" /></div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Sel name="albumId" label="Album" options={albums} />
          <Sel name="projectId" label="Project" options={projects} />
          <Sel name="eventId" label="Event" options={events} />
          <Sel name="yearId" label="Rotaract year (auto from date)" options={years} />
          <div className="field"><label className="label" htmlFor="date">Date taken</label><input id="date" name="date" type="date" className="input" /></div>
          <div className="field"><label className="label" htmlFor="phase">Then → Now phase</label><select id="phase" name="phase" className="input"><option value="">—</option>{E.phase.map((p) => <option key={p} value={p}>{humanize(p)}</option>)}</select></div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="field"><label className="label" htmlFor="caption">Caption (all photos)</label><input id="caption" name="caption" className="input" /></div>
          <div className="field"><label className="label" htmlFor="credit">Photo credit</label><input id="credit" name="credit" className="input" /></div>
          <div className="field"><label className="label" htmlFor="source">Source</label><input id="source" name="source" className="input" placeholder="e.g. Club photographer" /></div>
          <div className="field"><label className="label" htmlFor="sourceUrl">Source URL</label><input id="sourceUrl" name="sourceUrl" type="url" className="input" /></div>
        </div>
        <div className="field"><span className="label">People in these photos</span><MultiPicker name="people" options={people} selected={[]} label="People" /></div>
        <SubmitButton className="btn-primary justify-self-start" pendingText="Uploading & optimising…">Upload</SubmitButton>
      </form>
    </>
  );
}
