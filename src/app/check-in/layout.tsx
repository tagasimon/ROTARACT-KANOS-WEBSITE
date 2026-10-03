import Link from "next/link";

/** Deliberately tiny layout: the check-in page must load fast on mobile data. */
export default function CheckInLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-royal text-paper">
      <header className="px-5 py-4">
        <Link href="/" className="text-sm font-bold tracking-tight">Rotaract <span className="text-gold">Kampala North</span></Link>
      </header>
      <main id="main" className="flex flex-1 flex-col justify-center px-5 pb-10">{children}</main>
    </div>
  );
}
