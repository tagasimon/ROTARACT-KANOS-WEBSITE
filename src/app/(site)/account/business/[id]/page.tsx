import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { BusinessForm } from "../BusinessForm";

export const metadata: Metadata = { title: "Edit business listing", robots: { index: false } };

const STATUS: Record<string, string> = {
  PUBLISHED: "Published",
  IN_REVIEW: "Waiting for an admin to publish it",
  DRAFT: "Draft",
  REJECTED: "Not published. Ask a club admin why, edit it and save to send it back for review.",
  ARCHIVED: "Archived (not shown on the website)",
};

export default async function EditBusinessPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ submitted?: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/account/business/${id}`);
  if (!user.member) notFound();
  const b = await db.business.findFirst({ where: { id, ownerId: user.member.personId } });
  if (!b) notFound();
  const { submitted } = await searchParams;
  return (
    <section className="container-x max-w-3xl py-14">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-stone"><Link href="/account" className="hover:text-fg">My account</Link></nav>
      <h1 className="text-4xl font-bold">{b.name}</h1>
      <p className="mb-8 mt-3 text-sm">
        <span className="font-semibold">Status:</span> {STATUS[b.publishStatus] || b.publishStatus}
        {b.publishStatus === "PUBLISHED" && <> · <Link href={`/businesses/${b.slug}`} className="link-u">View the listing</Link></>}
      </p>
      {submitted && <p role="status" className="mb-6 rounded-sm bg-grass/10 px-3 py-2 text-sm font-semibold">Thanks. Your listing has been sent to the club admins, who will publish it after a quick check.</p>}
      <BusinessForm id={b.id} b={b} />
    </section>
  );
}
