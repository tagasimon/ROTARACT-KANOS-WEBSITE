import Link from "next/link";
export default function NotFound() {
  return (
    <section className="container-x py-32">
      <p className="eyebrow">404</p>
      <h1 className="mt-4 text-6xl font-bold">Not in the archive (yet).</h1>
      <p className="mt-4 max-w-xl font-serif text-xl text-stone">The page you're looking for doesn't exist or hasn't been published.</p>
      <div className="mt-8 flex gap-3"><Link href="/" className="btn-ink">Home</Link><Link href="/search" className="btn-ghost">Search</Link></div>
    </section>
  );
}
