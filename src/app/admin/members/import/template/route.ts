import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { csvResponse, toCsv } from "@/lib/csv";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "members")) return new Response("Not allowed", { status: 403 });
  return csvResponse(toCsv([["Name", "Member ID", "Status", "Email", "Phone", "Membership date", "Profession", "Organisation", "Notes"]]), "kanos-members-template.csv");
}
