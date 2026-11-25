import Link from "next/link";
import { requireArea } from "@/lib/auth";
import { ImportForm } from "./ImportForm";

export const metadata = { title: "Import members" };

export default async function ImportMembersPage() {
  await requireArea("members");
  return (
    <>
      <p className="eyebrow"><Link href="/admin/members" className="hover:underline">Members</Link></p>
      <h1 className="mb-3 text-4xl font-bold">Import members from a spreadsheet</h1>
      <div className="mb-8 max-w-3xl space-y-3 text-sm text-charcoal">
        <p>Save the club&rsquo;s register as a CSV file (in Excel: File → Save As → CSV; in Google Sheets: File → Download → CSV), then upload it here. You&rsquo;ll see exactly what will happen to each row before anything is saved.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Columns:</strong> Name (required), Member ID, Status, Buddy group, Email, Phone, Membership date, Profession, Organisation, Notes. The first row must hold the column names; any order works. <a href="/admin/members/import/template" className="font-semibold text-cranberry underline">Download a blank template</a>.</li>
          <li><strong>No duplicates:</strong> a row matching an existing member by Member ID, email or phone updates that member. A new member whose name exactly matches one existing member profile is linked to it.</li>
          <li><strong>Profiles stay as they are:</strong> profession and organisation are only filled in where a profile has none, so members&rsquo; own edits are never overwritten. New profiles are hidden from the website.</li>
          <li><strong>Formats:</strong> dates like 2024-07-15 or 15/07/2024 (day first). Ugandan phone numbers in any common format, such as 0772 123456 or +256 772 123456. Status: Active, Pending, Inactive, Alumni, Honorary or Archived. Rows without a Member ID get the next free one (KN-0001, KN-0002…).</li>
          <li>A CSV exported from the Members page can be edited and imported again.</li>
        </ul>
      </div>
      <ImportForm />
    </>
  );
}
