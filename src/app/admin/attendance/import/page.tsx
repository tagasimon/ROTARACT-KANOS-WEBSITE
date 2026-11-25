import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireArea } from "@/lib/auth";
import { ImportSignIns } from "./ImportSignIns";

export const metadata = { title: "Import old sign-ins" };

export default async function ImportSignInsPage() {
  await requireArea("attendance");
  return (
    <>
      <Link href="/admin/attendance" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-stone hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> Meeting sign-in</Link>
      <p className="eyebrow">Attendance</p>
      <h1 className="text-4xl font-bold">Import old sign-ins</h1>
      <div className="mb-8 mt-3 max-w-3xl space-y-2 text-sm text-stone">
        <p>Bring in attendance from the club&rsquo;s old sign-in sheet (Excel .xlsx or CSV, one row per sign-in). You&rsquo;ll see exactly what will happen before anything is saved.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong className="text-fg">Columns:</strong> Name and Date (required), plus Email, Is club member, Club name, Buddy group and Phone. A phone column without a heading is found automatically. GPS and visit counts are not imported.</li>
          <li><strong className="text-fg">Meetings</strong> are made one per day (Kampala time). A sign-in after midnight counts for the evening before. Days that already have a meeting are reused.</li>
          <li><strong className="text-fg">Members</strong> are matched to the register by email, phone or exact name, even when an email was mistyped. Anyone not in the register is added with a hidden profile and their buddy group.</li>
          <li><strong className="text-fg">No emails</strong> are sent for imported sign-ins. Importing the same file, or a fuller one, again only adds what&rsquo;s new.</li>
        </ul>
      </div>
      <ImportSignIns />
    </>
  );
}
