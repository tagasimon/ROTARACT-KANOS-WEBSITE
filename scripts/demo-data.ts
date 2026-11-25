/**
 * DEMO DATA for local testing only. Creates obviously fake members ("Demo Member 01"…),
 * 20 past weekly meetings with members and a few visitors, so the attendance pages have something to show.
 * Remove with: npm run demo -- --clear
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

(async () => {
  if (process.argv.includes("--clear")) {
    const ms = await db.member.findMany({ where: { memberNumber: { startsWith: "DEMO-" } } });
    const meetings = await db.meeting.deleteMany({ where: { title: { startsWith: "[Demo]" } } });
    await db.user.deleteMany({ where: { memberId: { in: ms.map((m) => m.id) } } });
    await db.person.deleteMany({ where: { id: { in: ms.map((m) => m.personId) } } });
    console.log(`Removed ${ms.length} demo members and ${meetings.count} demo meetings.`);
    return db.$disconnect();
  }
  const members = [];
  for (let i = 1; i <= 24; i++) {
    const n = String(i).padStart(2, "0");
    const person = await db.person.upsert({
      where: { slug: `demo-member-${n}` },
      update: {},
      create: { slug: `demo-member-${n}`, name: `Demo Member ${n}`, type: "MEMBER", isPublic: false, verification: "VERIFIED", sourceType: "DEMO" },
    });
    const m = await db.member.upsert({
      where: { memberNumber: `DEMO-${n}` },
      update: {},
      create: { personId: person.id, memberNumber: `DEMO-${n}`, email: `demo-${n}@example.org`, phone: `+2567000000${n}`, status: i > 22 ? "INACTIVE" : "ACTIVE", membershipDate: new Date(Date.UTC(2025, i % 12, 1)) },
    });
    members.push({ ...m, name: person.name });
  }
  const visitors = [
    { name: "Demo Visitor A", clubName: "Rotaract Club of Gayaza", affiliation: "ROTARACTOR" as const },
    { name: "Demo Visitor B", clubName: "Rotary Club of Kampala-North", affiliation: "ROTARIAN" as const },
    { name: "Demo Prospect C", clubName: null, affiliation: "PROSPECT" as const },
  ];
  // The last 20 Fridays at 6 PM Kampala (15:00 UTC), skipping any day that already has a real meeting.
  const nowK = new Date(Date.now() + 3 * 3600000);
  const lastFri = new Date(Date.UTC(nowK.getUTCFullYear(), nowK.getUTCMonth(), nowK.getUTCDate() - ((nowK.getUTCDay() + 2) % 7) - 7));
  let made = 0;
  for (let w = 0; w < 20; w++) {
    const day = new Date(lastFri.getTime() - w * 7 * 86400000);
    if (await db.meeting.findUnique({ where: { day } })) continue;
    const date = new Date(day.getTime() + 15 * 3600000);
    const meeting = await db.meeting.create({ data: { title: "[Demo] Weekly meeting", type: "WEEKLY", day, date, venue: "Hotel Triangle, Buganda Road, Kampala" } });
    made++;
    for (const [i, m] of members.entries()) {
      if (m.status !== "ACTIVE" || (m.membershipDate && date < m.membershipDate)) continue;
      if (Math.random() < 0.35 + ((i * 37) % 60) / 100)
        await db.attendanceRecord.create({ data: { meetingId: meeting.id, memberId: m.id, name: m.name, email: m.email, phone: m.phone, affiliation: "ROTARACTOR", clubName: "Rotaract Club Kampala North", checkedInAt: new Date(date.getTime() + Math.random() * 3600000) } });
    }
    for (const v of visitors)
      if (Math.random() < 0.3)
        await db.attendanceRecord.create({ data: { meetingId: meeting.id, name: v.name, isGuest: true, affiliation: v.affiliation, clubName: v.clubName, email: `${v.name.toLowerCase().replace(/\W+/g, "-")}@example.org`, checkedInAt: new Date(date.getTime() + Math.random() * 3600000) } });
  }
  console.log(`Demo data created: 24 members, ${made} meetings.`);
  await db.$disconnect();
})();
