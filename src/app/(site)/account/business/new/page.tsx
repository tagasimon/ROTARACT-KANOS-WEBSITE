import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { BusinessForm } from "../BusinessForm";

export const metadata: Metadata = { title: "Add a business listing", robots: { index: false } };

export default async function NewBusinessPage() {
  const user = await requireUser("/account/business/new");
  return (
    <section className="container-x max-w-3xl py-14">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-stone"><Link href="/account" className="hover:text-fg">My account</Link></nav>
      <h1 className="text-4xl font-bold">List your business</h1>
      <p className="mb-8 mt-3 font-serif text-lg text-stone">Add a business or practice you run to the club&rsquo;s <Link href="/businesses" className="link-u">member businesses</Link> directory. An admin publishes it after a quick check.</p>
      {user.member ? <BusinessForm id={null} b={{}} /> : <p className="font-serif text-lg text-stone">Your account isn&rsquo;t linked to a member profile. Ask a club admin to link it.</p>}
    </section>
  );
}
