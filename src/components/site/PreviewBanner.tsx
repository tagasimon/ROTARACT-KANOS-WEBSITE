import Link from "next/link";
import { Eye } from "lucide-react";

const LABEL: Record<string, string> = {
  DRAFT: "a draft",
  IN_REVIEW: "waiting for review",
  REJECTED: "rejected",
  ARCHIVED: "archived",
  HIDDEN: "hidden from the public",
};

/** Shown at the top of an unpublished page that an admin is previewing. */
export function PreviewBanner({ status, editHref }: { status: string; editHref: string }) {
  return (
    <div role="status" className="border-b border-fg/10 bg-gold text-fg print:hidden">
      <div className="container-x flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3 text-sm">
        <p className="flex items-center gap-2">
          <Eye className="size-4 shrink-0" aria-hidden />
          <span><strong>Preview.</strong> This page is {LABEL[status] || "not published"}, so only admins can see it.</span>
        </p>
        <Link href={editHref} className="font-semibold underline underline-offset-4">Edit in admin</Link>
      </div>
    </div>
  );
}
