export function Done({ name, at, already, children }: { name: string; at: string; already?: boolean; children?: React.ReactNode }) {
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Kampala", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(at));
  return (
    <div role="status" className="text-center">
      <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-grass text-5xl" aria-hidden>✓</div>
      <h1 className="mt-6 text-4xl font-bold">{already ? "You're already in." : "You're checked in."}</h1>
      <p className="mt-3 text-lg text-paper/75">{name} · {time}</p>
      {children}
    </div>
  );
}
