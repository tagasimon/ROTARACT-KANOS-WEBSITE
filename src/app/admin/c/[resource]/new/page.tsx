import Link from "next/link";
import { notFound } from "next/navigation";
import { requireArea } from "@/lib/auth";
import { getResource } from "@/lib/admin/resources";
import { ResourceForm } from "@/components/admin/ResourceForm";
import { Flash } from "@/components/admin/Flash";
import { saveResource } from "../actions";

export default async function NewResource({ params, searchParams }: { params: Promise<{ resource: string }>; searchParams: Promise<Record<string, string>> }) {
  const r = getResource((await params).resource);
  if (!r) notFound();
  await requireArea(r.area);
  const sp = await searchParams;
  const action = saveResource.bind(null, r.key, null);
  return (
    <>
      <Flash sp={sp} />
      <p className="eyebrow"><Link href={`/admin/c/${r.key}`} className="hover:underline">{r.label}</Link></p>
      <h1 className="mb-8 text-4xl font-bold">New {r.singular.toLowerCase()}</h1>
      <ResourceForm r={r} row={null} action={action} prefill={sp} />
    </>
  );
}
