import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { ADMIN_ROLES, ROLE_LABEL, can } from "@/lib/rbac";
import { RESOURCES } from "@/lib/admin/resources";
import { db } from "@/lib/db";
import { AdminNav } from "@/components/admin/AdminNav";
import { logout } from "@/app/(site)/login/actions";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(ADMIN_ROLES, "/admin");
  const reviewCount = can(user.role, "review")
    ? (await Promise.all([
        db.event.count({ where: { publishStatus: "IN_REVIEW", mergedIntoId: null } }),
        db.socialPost.count({ where: { publishStatus: "IN_REVIEW" } }),
      ])).reduce((a, b) => a + b, 0)
    : 0;
  const newInquiries = can(user.role, "inquiries") ? await db.inquiry.count({ where: { status: "NEW" } }) : 0;

  const groups: { title: string; items: { href: string; label: string; badge?: number }[] }[] = [
    {
      title: "Overview",
      items: [
        { href: "/admin", label: "Dashboard" },
        ...(can(user.role, "review") ? [{ href: "/admin/review", label: "Needs review", badge: reviewCount }] : []),
        ...(can(user.role, "content") ? [{ href: "/admin/import", label: "Import post" }] : []),
      ],
    },
    ...(can(user.role, "attendance")
      ? [{ title: "Attendance", items: [{ href: "/admin/attendance", label: "Attendance dashboard" }, { href: "/admin/attendance/sessions", label: "QR sessions" }, { href: "/admin/attendance/records", label: "Records & corrections" }] }]
      : []),
  ];
  const resGroups = new Map<string, { href: string; label: string; badge?: number }[]>();
  for (const r of RESOURCES) {
    if (!can(user.role, r.area) || r.navHidden) continue;
    if (!resGroups.has(r.group)) resGroups.set(r.group, []);
    resGroups.get(r.group)!.push({ href: r.listHref || `/admin/c/${r.key}`, label: r.label, badge: r.key === "inquiries" ? newInquiries : undefined });
  }
  for (const [title, items] of resGroups) {
    if (title === "Media" && can(user.role, "content")) items.unshift({ href: "/admin/upload", label: "Upload photos" });
    groups.push({ title, items });
  }
  const sys = [
    ...(can(user.role, "users") ? [{ href: "/admin/users", label: "Users & roles" }] : []),
    ...(can(user.role, "settings") ? [{ href: "/admin/settings", label: "Settings" }] : []),
    ...(can(user.role, "events") ? [{ href: "/admin/discovery", label: "Event discovery" }] : []),
    ...(can(user.role, "audit") ? [{ href: "/admin/audit", label: "Audit log" }] : []),
  ];
  if (sys.length) groups.push({ title: "System", items: sys });

  return (
    <div className="min-h-dvh bg-paper-2 lg:grid lg:grid-cols-[16rem_1fr]">
      <AdminNav groups={groups}>
        <div className="border-t border-paper/10 p-4 text-xs text-paper/60">
          <p className="truncate font-semibold text-paper">{user.member?.person.name || user.email}</p>
          <p>{ROLE_LABEL[user.role]}</p>
          <div className="mt-3 flex gap-3">
            <Link href="/" className="hover:text-paper">View site</Link>
            <Link href="/account" className="hover:text-paper">Account</Link>
            <form action={logout}><button className="hover:text-paper">Sign out</button></form>
          </div>
        </div>
      </AdminNav>
      <div className="min-w-0">
        <main id="main" className="mx-auto max-w-[1200px] px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
