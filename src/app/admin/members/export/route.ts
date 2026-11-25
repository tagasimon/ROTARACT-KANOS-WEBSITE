import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { csvResponse, toCsv } from "@/lib/csv";
import { memberCsvRows } from "@/lib/members";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "members")) return new Response("Not allowed", { status: 403 });
  const url = new URL(req.url);
  const filter = { q: url.searchParams.get("q") || undefined, status: url.searchParams.get("status") || undefined };
  const rows = await memberCsvRows(filter);
  await audit(user.id, "export", "member", null, `Exported ${rows.length - 1} members`, filter);
  const date = new Date().toISOString().slice(0, 10);
  return csvResponse(toCsv(rows), `kanos-members-${filter.status ? filter.status.toLowerCase() + "-" : ""}${date}.csv`);
}
