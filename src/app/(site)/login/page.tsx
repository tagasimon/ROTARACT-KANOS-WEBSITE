import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Member sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(next || "/account");
  return (
    <section className="container-x grid min-h-[70vh] gap-14 py-16 lg:grid-cols-2 lg:items-center">
      <div>
        <p className="eyebrow mb-4">Members & admins</p>
        <h1 className="text-6xl font-bold leading-none">Sign in.</h1>
        <p className="mt-6 max-w-md font-serif text-xl text-stone">Sign in once on your phone and you'll stay signed in, so scanning the meeting QR code records your attendance in a second.</p>
      </div>
      <div className="rounded-sm bg-paper-2 p-6 sm:p-10">
        <LoginForm next={next} />
        <p className="mt-6 text-sm text-stone">First time? <Link href={`/activate${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="link-u font-semibold text-fg">Activate your member account</Link> with the Member ID and PIN from the club.</p>
      </div>
    </section>
  );
}
