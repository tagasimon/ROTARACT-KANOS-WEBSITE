import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ADMIN_ROLES, ROLE_LABEL } from "@/lib/rbac";
import { logout } from "../login/actions";
import { ProfileForm, PasswordForm, PinChangeForm } from "./Forms";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default async function AccountPage() {
  const user = await requireUser("/account");
  const [person, skills, businesses] = await Promise.all([
    user.member ? db.person.findUnique({ where: { id: user.member.personId }, include: { skills: { select: { id: true } } } }) : null,
    db.skill.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    user.member ? db.business.findMany({ where: { ownerId: user.member.personId }, select: { id: true, name: true, publishStatus: true }, orderBy: { name: "asc" } }) : [],
  ]);
  return (
    <section className="container-x py-14">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow mb-2">{ROLE_LABEL[user.role]}{user.member && ` · ${user.member.memberNumber}`}</p>
          <h1 className="text-5xl font-bold">{person?.name || user.email}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.member && <Link href="/account/attendance" className="btn-primary">My attendance</Link>}
          {person?.isPublic && <Link href={`/people/${person.slug}`} className="btn-ghost">View public profile</Link>}
          {ADMIN_ROLES.includes(user.role) && <Link href="/admin" className="btn-ink">Admin</Link>}
          <form action={logout}><button className="btn-ghost">Sign out</button></form>
        </div>
      </div>
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <h2 className="mb-6 text-2xl font-bold">Public profile</h2>
          {person ? <ProfileForm p={person} skills={skills} /> : <p className="font-serif text-lg text-stone">Your account isn't linked to a member profile. Ask a club admin to link it.</p>}
        </div>
        <aside className="space-y-10 lg:col-span-4">
          {user.member && (
            <div id="businesses" className="rounded-sm border border-line bg-white p-6">
              <h2 className="mb-1 font-bold">Your business listings</h2>
              <p className="mb-4 text-sm text-stone">List a business or practice you run in the <Link href="/businesses" className="underline">member businesses</Link> directory.</p>
              {businesses.length > 0 && (
                <ul className="mb-4 divide-y divide-line border-y border-line">
                  {businesses.map((b) => (
                    <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                      <Link href={`/account/business/${b.id}`} className="font-semibold hover:text-cranberry">{b.name}</Link>
                      <span className="shrink-0 text-xs text-stone">{b.publishStatus === "PUBLISHED" ? "Published" : b.publishStatus === "IN_REVIEW" ? "Waiting to be published" : b.publishStatus === "REJECTED" ? "Not published" : b.publishStatus === "ARCHIVED" ? "Archived" : "Draft"}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/account/business/new" className="btn-ghost btn-sm">Add a business</Link>
            </div>
          )}
          <div className="rounded-sm border border-line bg-white p-6"><h2 className="mb-4 font-bold">Password</h2><PasswordForm /></div>
          {user.member && <div className="rounded-sm border border-line bg-white p-6"><h2 className="mb-1 font-bold">Check-in PIN</h2><p className="mb-4 text-sm text-stone">Used with your Member ID when you check in on a phone that isn't signed in.</p><PinChangeForm /></div>}
        </aside>
      </div>
    </section>
  );
}
