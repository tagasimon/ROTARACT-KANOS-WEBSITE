"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireArea } from "@/lib/auth";
import { getResource } from "@/lib/admin/resources";
import { delegate, rowTitle, saveRow, ValidationError } from "@/lib/admin/crud";
import { audit } from "@/lib/audit";

function fail(key: string, id: string | null, msg: string, back?: string) {
  const base = back || (id ? `/admin/c/${key}/${id}` : `/admin/c/${key}/new`);
  redirect(`${base}${base.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`);
}

export async function saveResource(key: string, id: string | null, fd: FormData) {
  const r = getResource(key);
  if (!r) throw new Error("Unknown resource");
  const user = await requireArea(r.area);
  let saved: Record<string, unknown>;
  try {
    const res = await saveRow(r, id, fd, user.id);
    saved = res.row;
  } catch (e) {
    const msg = e instanceof ValidationError ? e.message : (e as { code?: string }).code === "P2002" ? "That value must be unique, and another record already uses it." : (e as Error).message.split("\n").slice(-1)[0];
    console.error(e);
    return fail(key, id, msg);
  }
  await audit(user.id, id ? "update" : "create", r.model, String(saved.id), `${r.singular}: ${rowTitle(r, saved)}`);
  revalidatePath("/", "layout");
  const ret = fd.get("__return");
  if (typeof ret === "string" && ret.startsWith("/admin")) redirect(ret);
  redirect(`/admin/c/${key}/${saved.id}?saved=1`);
}

export async function deleteResource(key: string, id: string) {
  const r = getResource(key);
  if (!r) throw new Error("Unknown resource");
  const user = await requireArea(r.area);
  try {
    const row = await delegate(r.model).delete({ where: { id } });
    await audit(user.id, "delete", r.model, id, `${r.singular}: ${rowTitle(r, row)}`, row as never);
  } catch (e) {
    const code = (e as { code?: string }).code;
    return fail(key, id, code === "P2003" ? "This record is still referenced elsewhere (e.g. a role used by leadership assignments). Remove those first." : (e as Error).message);
  }
  revalidatePath("/", "layout");
  redirect(`/admin/c/${key}?deleted=1`);
}

export async function quickVerify(key: string, id: string) {
  const r = getResource(key);
  if (!r) throw new Error("Unknown resource");
  const user = await requireArea(r.area);
  await delegate(r.model).update({ where: { id }, data: { verification: "VERIFIED", verifiedAt: new Date(), verifiedById: user.id } });
  await audit(user.id, "verify", r.model, id);
  revalidatePath("/", "layout");
}
