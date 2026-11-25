import "server-only";
import { getCurrentUser } from "@/lib/auth";
import { can, type Area } from "@/lib/rbac";

/**
 * Signed-in admins who can edit a kind of content may open its unpublished pages
 * (drafts, items in review, hidden profiles) to check them before publishing.
 * Everyone else gets a 404, exactly as before.
 */
export async function canPreview(area: Area) {
  const user = await getCurrentUser();
  return !!user && can(user.role, area);
}
