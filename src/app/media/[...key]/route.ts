import { storage, mimeFor } from "@/lib/storage";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/rbac";

export async function GET(_: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  if (key.includes("..")) return new Response("Bad request", { status: 400 });
  // private documents require an admin session
  if (key.startsWith("documents/")) {
    const doc = await db.document.findFirst({ where: { storageKey: key }, select: { isPublic: true } });
    if (doc && !doc.isPublic) {
      const u = await getCurrentUser();
      if (!u || !ADMIN_ROLES.includes(u.role)) return new Response("Not found", { status: 404 });
    }
  }
  const file = await storage().get(key);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.body), {
    headers: {
      "Content-Type": file.contentType || mimeFor(key),
      "Cache-Control": key.startsWith("images/") ? "public, max-age=31536000, immutable" : "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
