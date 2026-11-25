"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireArea } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { applySignInImport, planSignInImport, readSheet, type ImportPreview } from "@/lib/meeting/import";

export type SignInImportState = {
  stage: "upload" | "preview";
  error?: string;
  /** the file's cells, kept between the preview and the import */
  rows?: string;
  fileName?: string;
  preview?: ImportPreview;
  /** pairs of people the admin said are the same ("keyA|keyB") */
  same?: string[];
};

const MAX_BYTES = 10 * 1024 * 1024;

function rowsFrom(json: string): string[][] | null {
  try {
    const v: unknown = JSON.parse(json);
    if (Array.isArray(v) && v.every((r) => Array.isArray(r) && r.every((c) => typeof c === "string"))) return v as string[][];
  } catch {}
  return null;
}
const pairsFrom = (fd: FormData) =>
  [...new Set(fd.getAll("same").map(String))]
    .map((v) => v.split("|"))
    .filter((p): p is [string, string] => p.length === 2 && !!p[0] && !!p[1]);

export async function importSignIns(_: SignInImportState, fd: FormData): Promise<SignInImportState> {
  const user = await requireArea("attendance");
  const mode = String(fd.get("mode") || "upload");

  if (mode === "preview" || mode === "apply") {
    const json = String(fd.get("rows") || "");
    const rows = rowsFrom(json);
    const fileName = String(fd.get("fileName") || "").slice(0, 200);
    if (!rows) return { stage: "upload", error: "The file's contents went missing. Upload it again." };
    const sameAs = pairsFrom(fd);
    const same = sameAs.map((p) => p.join("|"));
    const plan = await planSignInImport(rows, { sameAs });
    if (plan.error) return { stage: "upload", error: plan.error };
    if (mode === "preview") return { stage: "preview", rows: json, fileName, preview: plan.preview, same };

    const res = await applySignInImport(plan, user.id);
    await audit(
      user.id,
      "import",
      "attendance",
      null,
      `Imported old sign-ins${fileName ? ` from ${fileName}` : ""}: ${res.recordsCreated} sign-ins, ${res.meetingsCreated} new meetings, ${res.peopleCreated} new members, ${res.peopleUpdated} members updated, ${res.groupsCreated} new buddy groups`,
      { ...res, fileName, merged: same.length },
    );
    revalidatePath("/admin/attendance");
    revalidatePath("/admin/members");
    if (res.failed.length) {
      const again = await planSignInImport(rows, { sameAs });
      return { stage: "preview", rows: json, fileName, preview: again.preview, same, error: `${res.failed.length} ${res.failed.length === 1 ? "member" : "members"} couldn't be saved (${res.failed.slice(0, 3).join("; ")}). Everything else was imported. Press Import again to retry them.` };
    }
    const parts = [
      `${res.recordsCreated} sign-ins`,
      res.meetingsCreated && `${res.meetingsCreated} meetings`,
      res.peopleCreated && `${res.peopleCreated} new members`,
      res.peopleUpdated && `${res.peopleUpdated} members updated`,
      res.groupsCreated && `${res.groupsCreated} buddy groups`,
    ].filter(Boolean);
    redirect(`/admin/attendance?msg=${encodeURIComponent(`Import finished: ${parts.join(", ")}.`)}`);
  }

  const file = fd.get("file");
  if (!(file instanceof File) || !file.size) return { stage: "upload", error: "Choose the sign-in sheet first." };
  if (file.size > MAX_BYTES) return { stage: "upload", error: "That file is larger than 10 MB. Split it into smaller files." };
  const read = await readSheet(file);
  if ("error" in read) return { stage: "upload", error: read.error };
  const plan = await planSignInImport(read.rows);
  if (plan.error) return { stage: "upload", error: plan.error };
  return { stage: "preview", rows: JSON.stringify(read.rows), fileName: file.name, preview: plan.preview, same: [] };
}
