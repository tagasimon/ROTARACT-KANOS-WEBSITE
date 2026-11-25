import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { csvResponse, toCsv } from "@/lib/csv";
import { meetingCsvRows } from "@/lib/meeting/csv";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "attendance")) return new Response("Not allowed", { status: 403 });
  const meetingId = new URL(req.url).searchParams.get("meeting") || undefined;
  const { rows, filename, count } = await meetingCsvRows(meetingId);
  await audit(user.id, "export", "attendance", meetingId ?? null, `Exported ${count} sign-ins${meetingId ? "" : " (all meetings)"}`);
  return csvResponse(toCsv(rows), filename);
}
