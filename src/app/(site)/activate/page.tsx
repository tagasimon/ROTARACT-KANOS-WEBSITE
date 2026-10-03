import type { Metadata } from "next";
import Link from "next/link";
import { ActivateForm } from "../login/LoginForm";

export const metadata: Metadata = { title: "Activate your account", robots: { index: false } };

export default async function ActivatePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <section className="container-x grid min-h-[70vh] gap-14 py-16 lg:grid-cols-2 lg:items-center">
      <div>
        <p className="eyebrow mb-4">One-time setup</p>
        <h1 className="text-6xl font-bold leading-none">Activate your account.</h1>
        <p className="mt-6 max-w-md font-serif text-xl text-stone">Use the Member ID and PIN the club gave you. You only do this once. After that, every QR scan at a meeting checks you in automatically.</p>
      </div>
      <div className="rounded-sm bg-paper-2 p-6 sm:p-10">
        <ActivateForm next={next} />
        <p className="mt-6 text-sm text-stone">Already have an account? <Link href="/login" className="link-u font-semibold text-fg">Sign in</Link></p>
      </div>
    </section>
  );
}
