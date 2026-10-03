"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireArea } from "@/lib/auth";
import { saveImageUpload } from "@/lib/media";
import { audit } from "@/lib/audit";
import { yearIdForDate } from "@/lib/years";
import type { PhotoPhase } from "@prisma/client";

export async function uploadPhotos(fd: FormData) {
  const user = await requireArea("content");
  const files = fd.getAll("files").filter((f): f is File => typeof f === "object" && (f as File).size > 0);
  if (!files.length) redirect("/admin/upload?error=Choose%20at%20least%20one%20image");
  const s = (k: string) => (String(fd.get(k) || "").trim() || null);
  const date = s("date") ? new Date(`${s("date")}T00:00:00+03:00`) : null;
  const yearId = s("yearId") || (date ? await yearIdForDate(date) : null);
  const people = fd.getAll("people").map(String).filter(Boolean);
  let ok = 0;
  const errors: string[] = [];
  for (const [i, f] of files.entries()) {
    try {
      await saveImageUpload(f, {
        albumId: s("albumId"), projectId: s("projectId"), eventId: s("eventId"), yearId, date,
        phase: (s("phase") as PhotoPhase | null) ?? undefined, caption: s("caption"), credit: s("credit"),
        source: s("source"), sourceUrl: s("sourceUrl"), sortOrder: i, verification: "VERIFIED",
        ...(people.length ? { people: { connect: people.map((id) => ({ id })) } } : {}),
      } as never);
      ok++;
    } catch (e) {
      errors.push(`${f.name}: ${(e as Error).message}`);
    }
  }
  await audit(user.id, "upload", "media", null, `${ok} photos`);
  revalidatePath("/", "layout");
  const back = s("albumId") ? `/admin/c/photos?albumId=${s("albumId")}` : s("projectId") ? `/admin/c/photos?projectId=${s("projectId")}` : "/admin/c/photos";
  redirect(`${back}${back.includes("?") ? "&" : "?"}msg=${encodeURIComponent(`${ok} photo${ok === 1 ? "" : "s"} uploaded and optimised.${errors.length ? ` ${errors.length} failed: ${errors.join("; ")}` : ""}`)}`);
}
