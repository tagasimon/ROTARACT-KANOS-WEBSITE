import ExcelJS from "exceljs";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { attendanceReport } from "@/lib/attendance-report";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

const csvCell = (v: unknown) => {
  const s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s; // neutralise spreadsheet formulas
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "attendance")) return new Response("Forbidden", { status: 403 });
  const sp = Object.fromEntries(new URL(req.url).searchParams.entries());
  const format = sp.format === "xlsx" ? "xlsx" : "csv";
  const r = await attendanceReport(sp);
  const records = await db.attendanceRecord.findMany({
    where: { sessionId: { in: r.sessions.map((s) => s.id) }, memberId: { in: r.rows.map((x) => x.memberId) } },
    include: { session: { select: { title: true, startsAt: true, type: true } }, member: { select: { memberNumber: true, person: { select: { name: true } } } } },
    orderBy: { checkedInAt: "asc" },
  });
  await audit(user.id, "export", "attendance", null, `${format} export (${records.length} records)`);
  const summary = r.rows.map((x) => [x.member.person.name, x.member.memberNumber, x.member.status, x.attended, x.expected, x.rate == null ? "" : Math.round(x.rate * 1000) / 10, x.lastAttendance, x.streak]);
  const summaryHead = ["Member", "Member ID", "Status", "Attended", "Expected", "Attendance %", "Last attended", "Current streak"];
  const detailHead = ["Meeting", "Meeting start", "Type", "Member", "Member ID", "Checked in", "Method", "Excused", "Note"];
  const detail = records.map((x) => [x.session.title, x.session.startsAt, x.session.type, x.member.person.name, x.member.memberNumber, x.checkedInAt, x.method, x.excused ? "yes" : "", x.note || ""]);
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "csv") {
    const body = [summaryHead, ...summary, [], detailHead, ...detail].map((row) => row.map(csvCell).join(",")).join("\r\n");
    return new Response("﻿" + body, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="attendance-${stamp}.csv"` } });
  }
  const wb = new ExcelJS.Workbook();
  wb.creator = "Rotaract Club Kampala North";
  const s1 = wb.addWorksheet("Summary");
  s1.addRow(summaryHead).font = { bold: true };
  summary.forEach((row) => s1.addRow(row));
  s1.columns.forEach((c, i) => (c.width = [28, 12, 10, 10, 10, 13, 18, 14][i]));
  s1.getColumn(7).numFmt = "dd mmm yyyy";
  const s2 = wb.addWorksheet("Check-ins");
  s2.addRow(detailHead).font = { bold: true };
  detail.forEach((row) => s2.addRow(row));
  s2.columns.forEach((c, i) => (c.width = [34, 18, 18, 28, 12, 18, 12, 9, 30][i]));
  s2.getColumn(2).numFmt = "dd mmm yyyy hh:mm";
  s2.getColumn(6).numFmt = "dd mmm yyyy hh:mm";
  const s3 = wb.addWorksheet("Meetings");
  s3.addRow(["Meeting", "Start", "Type", "Present"]).font = { bold: true };
  r.sessions.forEach((x) => s3.addRow([x.title, x.startsAt, x.type, x._count.records]));
  s3.columns.forEach((c, i) => (c.width = [34, 18, 18, 10][i]));
  s3.getColumn(2).numFmt = "dd mmm yyyy hh:mm";
  for (const ws of [s1, s2, s3]) ws.views = [{ state: "frozen", ySplit: 1 }];
  const buf = await wb.xlsx.writeBuffer();
  return new Response(new Uint8Array(buf as ArrayBuffer), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="attendance-${stamp}.xlsx"` } });
}
