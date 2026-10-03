import Link from "next/link";
import { notFound } from "next/navigation";
import { requireArea } from "@/lib/auth";
import { db } from "@/lib/db";
import { mediaSrc } from "@/lib/media";
import { E } from "@/lib/admin/resources";
import { fmtDate, humanize } from "@/lib/utils";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Flash } from "@/components/admin/Flash";
import { convertPost } from "./actions";

export const metadata = { title: "Convert post" };

export default async function ConvertPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  await requireArea("content");
  const { id } = await params;
  const sp = await searchParams;
  const post = await db.socialPost.findUnique({ where: { id }, include: { image: true, project: true, organization: true } });
  if (!post) notFound();
  const [projects, orgs, people] = await Promise.all([
    db.project.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
    db.organization.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.person.findMany({ where: { type: "MEMBER" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const img = mediaSrc(post.image, "md") || post.imageUrl;
  const firstLine = (post.content || "").split(/\n|\.\s/)[0].slice(0, 90);
  const converted = (post.convertedTo as { type: string; id: string }[]) || [];
  const dateDefault = post.postedAt ? new Date(post.postedAt.getTime() + 3 * 3600000).toISOString().slice(0, 10) : "";

  const Card = ({ target, title, desc, children }: { target: Parameters<typeof convertPost>[1]; title: string; desc: string; children?: React.ReactNode }) => (
    <form action={convertPost.bind(null, id, target)} className="card grid content-start gap-3 p-5">
      <p className="font-display text-xl font-bold">{title}</p>
      <p className="text-sm text-stone">{desc}</p>
      <input name="title" defaultValue={firstLine} aria-label="Title" className="input" />
      {children}
      <SubmitButton className="btn-ink btn-sm justify-self-start" pendingText="Creating…">Create {title.toLowerCase()}</SubmitButton>
    </form>
  );

  return (
    <>
      <Flash sp={sp} />
      <p className="eyebrow"><Link href="/admin/c/social" className="hover:underline">Social posts</Link></p>
      <h1 className="mb-6 text-4xl font-bold">Turn this post into…</h1>
      <div className="card mb-8 grid gap-5 p-5 sm:grid-cols-[10rem_1fr]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {img ? <img src={img} alt="" className="aspect-square w-full rounded-md object-cover" /> : <div className="aspect-square rounded-md bg-paper-2" />}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone">{humanize(post.platform)} · {post.postedAt ? fmtDate(post.postedAt) : "undated"} · {post.organization?.name} · {humanize(post.publishStatus)}</p>
          <p className="mt-2 whitespace-pre-line font-serif text-lg">{post.content || <em>No text</em>}</p>
          <div className="mt-3 flex gap-4 text-sm"><a href={post.url} target="_blank" rel="noopener noreferrer" className="link-u">Original</a><Link href={`/admin/c/social/${post.id}`} className="link-u">Edit post</Link></div>
          {converted.length > 0 && <p className="mt-3 text-sm text-fg">Already converted to: {converted.map((c) => c.type).join(", ")}</p>}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card target="story" title="Story" desc="An editorial story in the From Kampala North feed. Created as a draft." />
        <Card target="spotlight" title="Member spotlight" desc="A story featuring one member.">
          <select name="personId" aria-label="Member" className="input"><option value="">Choose member…</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </Card>
        <Card target="milestone" title="Project milestone" desc="Adds a dated step to a project's journey.">
          <select name="projectId" defaultValue={post.projectId || ""} aria-label="Project" className="input"><option value="">Choose project…</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select>
          <div className="grid grid-cols-2 gap-2"><select name="stage" defaultValue="UPDATE" aria-label="Stage" className="input">{E.stage.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</select><input type="date" name="date" defaultValue={dateDefault} aria-label="Date" className="input" /></div>
        </Card>
        <Card target="achievement" title="Achievement" desc="A structured achievement record (draft).">
          <input type="date" name="date" defaultValue={dateDefault} aria-label="Date" className="input" />
        </Card>
        <Card target="event" title="Event" desc="Creates an event (draft) and links this post as a source.">
          <div className="grid grid-cols-2 gap-2"><input type="date" name="date" defaultValue={dateDefault} aria-label="Event date" className="input" /><select name="type" defaultValue="FELLOWSHIP" aria-label="Type" className="input">{E.eventType.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</select></div>
          <select name="organizerId" defaultValue={post.organizationId || ""} aria-label="Organizer" className="input">{orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
        </Card>
        <Card target="album" title="Photo album" desc="Starts an album with this post's image. Add more photos afterwards." />
      </div>
    </>
  );
}
