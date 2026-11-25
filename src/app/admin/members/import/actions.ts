"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireArea } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { applyMemberImport, planMemberImport, type PlanRow } from "@/lib/admin/member-import";

export type ImportState = {
  stage: "upload" | "preview";
  error?: string;
  csv?: string;
  fileName?: string;
  rows?: Omit<PlanRow, "apply">[];
  counts?: Record<string, number>;
  ignoredColumns?: string[];
  failed?: { line: number; name: string; error: string }[];
};

const MAX_BYTES = 2 * 1024 * 1024;

export async function importMembers(_: ImportState, fd: FormData): Promise<ImportState> {
  const user = await requireArea("members");
  const mode = fd.get("mode");

  if (mode === "apply") {
    const csv = String(fd.get("csv") || "");
    const plan = await planMemberImport(csv);
    if (plan.error) return { stage: "upload", error: plan.error };
    const res = await applyMemberImport(plan);
    await audit(user.id, "import", "member", null, `Imported members: ${res.created} new, ${res.linked} linked to existing profiles, ${res.updated} updated, ${res.failed.length} failed`, { ...res, file: String(fd.get("fileName") || "") });
    revalidatePath("/admin/members");
    if (res.failed.length) {
      const again = await planMemberImport(csv);
      return { stage: "preview", csv, fileName: String(fd.get("fileName") || ""), rows: again.rows.map(({ apply: _a, ...r }) => r), counts: again.counts, ignoredColumns: again.ignoredColumns, failed: res.failed, error: `${res.failed.length} ${res.failed.length === 1 ? "row" : "rows"} couldn't be saved. The rest were imported.` };
    }
    const parts = [res.created && `${res.created} added`, res.linked && `${res.linked} linked to existing profiles`, res.updated && `${res.updated} updated`].filter(Boolean);
    redirect(`/admin/members?msg=${encodeURIComponent(`Import finished: ${parts.join(", ") || "nothing to change"}.`)}`);
  }

  const file = fd.get("file");
  if (!(file instanceof File) || !file.size) return { stage: "upload", error: "Choose a CSV file first." };
  if (file.size > MAX_BYTES) return { stage: "upload", error: "That file is larger than 2 MB. Split it into smaller files." };
  if (!/\.(csv|txt)$/i.test(file.name) && !/csv|text\/plain/.test(file.type)) return { stage: "upload", error: "That isn't a CSV file. In Excel or Google Sheets, use File → Save as / Download → CSV." };
  const csv = await file.text();
  const plan = await planMemberImport(csv);
  if (plan.error) return { stage: "upload", error: plan.error };
  return { stage: "preview", csv, fileName: file.name, rows: plan.rows.map(({ apply: _a, ...r }) => r), counts: plan.counts, ignoredColumns: plan.ignoredColumns };
}
