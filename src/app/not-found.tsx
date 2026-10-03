import Link from "next/link";
export default function NotFound() {
  return (
    <main className="container-x py-32">
      <p className="eyebrow">404</p>
      <h1 className="mt-4 text-6xl font-bold">Page not found.</h1>
      <Link href="/" className="btn-ink mt-8">Go home</Link>
    </main>
  );
}
