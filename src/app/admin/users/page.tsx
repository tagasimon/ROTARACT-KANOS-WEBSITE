import { requireArea } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/rbac";
import { fmtShort } from "@/lib/utils";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Flash } from "@/components/admin/Flash";
import { createUser, updateUser } from "./actions";

export const metadata = { title: "Users & roles" };
const ROLES = Object.keys(ROLE_LABEL) as (keyof typeof ROLE_LABEL)[];

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireArea("users");
  const sp = await searchParams;
  const [users, members] = await Promise.all([
    db.user.findMany({ include: { member: { include: { person: { select: { name: true } } } } }, orderBy: [{ role: "asc" }, { email: "asc" }] }),
    db.member.findMany({ include: { person: { select: { name: true } }, user: { select: { id: true } } }, orderBy: { person: { name: "asc" } } }),
  ]);
  const MemberSelect = ({ value, self }: { value?: string | null; self?: string }) => (
    <select name="memberId" defaultValue={value || ""} className="input" aria-label="Linked member">
      <option value="">No member link</option>
      {members.filter((m) => !m.user || m.user.id === self).map((m) => <option key={m.id} value={m.id}>{m.person.name} ({m.memberNumber})</option>)}
    </select>
  );
  return (
    <>
      <Flash sp={sp} />
      <p className="eyebrow">System</p>
      <h1 className="mb-2 text-4xl font-bold">Users & roles</h1>
      <div className="mb-8 grid gap-2 text-sm text-stone sm:grid-cols-2 lg:grid-cols-5">
        {[["Super admin", "Everything, including users and settings"], ["Club admin", "Content, events, people, projects, members, attendance, settings"], ["Attendance officer", "Meeting sign-in: attendance, emails, make-up cards, exports, and member records"], ["Editor", "Stories, projects, events, media, review queue"], ["Member", "Own profile and own attendance"]].map(([r, d]) => <div key={r} className="card p-3"><p className="font-semibold text-fg">{r}</p><p className="text-xs">{d}</p></div>)}
      </div>
      <div className="card mb-8 overflow-x-auto">
        <table className="table-x">
          <thead><tr><th>Email</th><th>Role</th><th>Member</th><th>Active</th><th>New password</th><th>Last login</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td colSpan={7} className="p-0">
                  <form action={updateUser.bind(null, u.id)} className="grid grid-cols-1 items-center gap-2 px-3 py-2.5 md:grid-cols-[1.4fr_1fr_1.4fr_auto_1fr_auto_auto]">
                    <span className="font-semibold">{u.email}</span>
                    <select name="role" defaultValue={u.role} className="input" aria-label="Role">{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
                    <MemberSelect value={u.memberId} self={u.id} />
                    <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="active" defaultChecked={u.active} /> Active</label>
                    <input name="password" type="password" placeholder="Reset password" autoComplete="new-password" className="input" aria-label="New password" />
                    <span className="text-xs text-stone">{u.lastLoginAt ? fmtShort(u.lastLoginAt) : "never"}</span>
                    <SubmitButton className="btn-ink btn-sm">Save</SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form action={createUser} className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        <p className="font-bold sm:col-span-2 lg:col-span-5">Add a user</p>
        <label className="field"><span className="label">Email</span><input name="email" type="email" required className="input" /></label>
        <label className="field"><span className="label">Temporary password</span><input name="password" type="password" minLength={8} required className="input" autoComplete="new-password" /></label>
        <label className="field"><span className="label">Role</span><select name="role" defaultValue="EDITOR" className="input">{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></label>
        <label className="field"><span className="label">Member link</span><MemberSelect /></label>
        <SubmitButton className="btn-primary">Create user</SubmitButton>
      </form>
      <p className="mt-4 text-xs text-stone">Members usually create their own accounts at /activate with their Member ID and PIN. Use this form for officers and editors.</p>
    </>
  );
}
