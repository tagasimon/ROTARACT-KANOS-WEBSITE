export function Flash({ sp }: { sp: Record<string, string | undefined> }) {
  if (sp.error) return <p role="alert" className="mb-6 rounded-md border border-cranberry/30 bg-cranberry/10 px-4 py-3 text-sm font-semibold text-cranberry">{sp.error}</p>;
  if (sp.saved) return <p role="status" className="mb-6 rounded-md border border-grass/30 bg-grass/10 px-4 py-3 text-sm font-semibold text-fg">Saved.</p>;
  if (sp.deleted) return <p role="status" className="mb-6 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold">Deleted.</p>;
  if (sp.denied) return <p role="alert" className="mb-6 rounded-md border border-gold/50 bg-gold/15 px-4 py-3 text-sm font-semibold">Your role doesn't have access to that section.</p>;
  if (sp.msg) return <p role="status" className="mb-6 rounded-md border border-grass/30 bg-grass/10 px-4 py-3 text-sm font-semibold text-fg">{sp.msg}</p>;
  return null;
}
