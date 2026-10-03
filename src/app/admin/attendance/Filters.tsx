import { db } from "@/lib/db";
import { E } from "@/lib/admin/resources";
import { humanize } from "@/lib/utils";

export async function AttendanceFilters({ sp, action }: { sp: Record<string, string>; action: string }) {
  const [years, committees] = await Promise.all([db.rotaractYear.findMany({ orderBy: { startDate: "desc" } }), db.committee.findMany({ orderBy: { name: "asc" } })]);
  return (
    <form action={action} className="card mb-6 grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-7 print:hidden">
      <label className="field"><span className="label">Month</span><input type="month" name="month" defaultValue={sp.month} className="input" /></label>
      <label className="field"><span className="label">Rotaract year</span><select name="yearId" defaultValue={sp.yearId || ""} className="input"><option value="">All</option>{years.map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}</select></label>
      <label className="field"><span className="label">From</span><input type="date" name="from" defaultValue={sp.from} className="input" /></label>
      <label className="field"><span className="label">To</span><input type="date" name="to" defaultValue={sp.to} className="input" /></label>
      <label className="field"><span className="label">Event type</span><select name="type" defaultValue={sp.type || ""} className="input"><option value="">All</option>{E.eventType.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}</select></label>
      <label className="field"><span className="label">Committee</span><select name="committeeId" defaultValue={sp.committeeId || ""} className="input"><option value="">All</option>{committees.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="field"><span className="label">Membership</span><select name="status" defaultValue={sp.status || ""} className="input"><option value="">Active + honorary</option>{E.memberStatus.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}</select></label>
      <div className="col-span-full flex gap-2"><button className="btn-ink btn-sm">Apply</button><a href={action} className="btn-ghost btn-sm bg-white">Reset</a></div>
    </form>
  );
}
